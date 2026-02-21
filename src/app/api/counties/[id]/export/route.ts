import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";
import { jsPDF } from "jspdf";

export const runtime = "nodejs";

type IdContext = { params: Promise<{ id: string }> };

type InvoiceRow = {
  id: string;
  case_number: string;
  matter: string;
  contact: string;
  hours: number | null;
  rate: number | null;
  status: string;
  due: string | null;
  created_at: string;
};

type CountyReportFormat =
  | "csv_line_per_invoice"
  | "pdf_line_per_invoice"
  | "pdf_grouped_by_case";

function n(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function csvEscape(cell: any) {
  return `"${String(cell ?? "").replace(/"/g, '""')}"`;
}

function normalizeLegacyFormat(v: string): "csv" | "pdf" | "" {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "csv") return "csv";
  if (s === "pdf") return "pdf";

  // If someone passes canonical values via query param, interpret them too.
  if (s === "csv_line_per_invoice") return "csv";
  if (s === "pdf_line_per_invoice") return "pdf";
  if (s === "pdf_grouped_by_case") return "pdf";

  return "";
}

function exportKindFromCountyFormat(f: any): "csv" | "pdf" {
  const s = String(f ?? "").trim().toLowerCase();
  if (s === "csv_line_per_invoice") return "csv";
  if (s === "pdf_line_per_invoice") return "pdf";
  if (s === "pdf_grouped_by_case") return "pdf";
  // Safe fallback: if DB contains unexpected value, default to CSV (non-breaking)
  return "csv";
}

export async function GET(req: NextRequest, context: IdContext) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;
    const { supabase, userEmail } = auth;

    const { id: countyId } = await context.params;

    const url = new URL(req.url);
    const preview = url.searchParams.get("preview") === "1";

    // Load county (scoped)
    const { data: county, error: countyErr } = await supabase
      .from("counties")
      .select("*")
      .eq("id", countyId)
      .eq("user_email", userEmail)
      .maybeSingle();

    if (countyErr) {
      console.error("Supabase load county error:", countyErr);
      return NextResponse.json({ error: "Failed to load county" }, { status: 500 });
    }
    if (!county) {
      return NextResponse.json({ error: "County not found" }, { status: 404 });
    }

    // Deterministic export format: derived from the county record.
    // Optional legacy override: accept ?format=csv|pdf (or canonical strings) if provided.
    const requested = normalizeLegacyFormat(url.searchParams.get("format") || "");
    const kind: "csv" | "pdf" =
      requested || exportKindFromCountyFormat(county.report_format as CountyReportFormat);

    // Pull only Sent invoices for this county
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_email", userEmail)
      .eq("county_id", countyId)
      .eq("status", "Sent")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase county export query error:", error);
      return NextResponse.json({ error: "Failed to load invoices for export" }, { status: 500 });
    }

    const rows = (invoices ?? []) as InvoiceRow[];

    const totals = rows.reduce(
      (acc, r) => {
        const hours = n(r.hours);
        const rate = n(r.rate);
        acc.cases += 1;
        acc.hours += hours;
        acc.amount += hours * rate;
        return acc;
      },
      { cases: 0, hours: 0, amount: 0 }
    );

    if (preview) {
      return NextResponse.json({
        county: { id: county.id, name: county.name, reportFormat: county.report_format },
        exportKind: kind, // "csv" | "pdf" (useful for UI)
        totals: {
          cases: totals.cases,
          hours: Math.round(totals.hours * 100) / 100,
          amount: Math.round(totals.amount * 100) / 100,
        },
        invoices: rows.slice(0, 25).map((r) => ({
          id: r.id,
          caseNumber: r.case_number,
          matter: r.matter,
          contact: r.contact,
          hours: n(r.hours),
          rate: n(r.rate),
          total: Math.round(n(r.hours) * n(r.rate) * 100) / 100,
          createdAt: r.created_at,
        })),
      });
    }

    if (kind === "csv") {
      const header = ["Case Number", "Matter", "Bill To", "Hours", "Rate", "Total"];
      const csv = [
        header.map(csvEscape).join(","),
        ...rows.map((r) => {
          const hours = n(r.hours);
          const rate = n(r.rate);
          const total = hours * rate;
          return [
            r.case_number,
            r.matter,
            r.contact,
            hours.toFixed(2),
            rate.toFixed(2),
            total.toFixed(2),
          ]
            .map(csvEscape)
            .join(",");
        }),
      ].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${county.name}-report.csv"`,
        },
      });
    }

    // kind === "pdf"
    {
      // Deterministic PDF (currently line-per-invoice for both pdf_* formats)
      const doc = new jsPDF("landscape", "mm", "letter");
      const marginLeft = 10;
      let cursorY = 20;

      doc.setFontSize(14);
      doc.text(`${county.name} - Month End Report`, marginLeft, cursorY);

      cursorY += 8;
      doc.setFontSize(11);
      doc.text(
        `Total invoices: ${totals.cases}    Total hours: ${totals.hours.toFixed(
          2
        )}    Total amount: $${totals.amount.toFixed(2)}`,
        marginLeft,
        cursorY
      );

      // If the county is configured as grouped-by-case, we can at least label it,
      // even if the body is still line-per-invoice. (No redesign / safe behavior.)
      const fmt = String(county.report_format ?? "").toLowerCase();
      if (fmt === "pdf_grouped_by_case") {
        cursorY += 6;
        doc.setFontSize(10);
        doc.text(`Format: PDF (grouped by case)`, marginLeft, cursorY);
      }

      cursorY += 10;

      doc.setFontSize(10);
      doc.text("Case #", marginLeft, cursorY);
      doc.text("Matter", marginLeft + 40, cursorY);
      doc.text("Hours", marginLeft + 120, cursorY);
      doc.text("Total ($)", marginLeft + 150, cursorY);
      doc.text("Bill To", marginLeft + 190, cursorY);

      cursorY += 6;

      const maxY = 190;

      for (const r of rows) {
        if (cursorY > maxY) {
          doc.addPage("letter", "landscape");
          cursorY = 20;

          doc.setFontSize(10);
          doc.text("Case #", marginLeft, cursorY);
          doc.text("Matter", marginLeft + 40, cursorY);
          doc.text("Hours", marginLeft + 120, cursorY);
          doc.text("Total ($)", marginLeft + 150, cursorY);
          doc.text("Bill To", marginLeft + 190, cursorY);

          cursorY += 6;
        }

        const hours = n(r.hours);
        const rate = n(r.rate);
        const total = hours * rate;

        const matterTrunc =
          r.matter.length > 40 ? r.matter.slice(0, 37) + "..." : r.matter;
        const contactTrunc =
          r.contact.length > 30 ? r.contact.slice(0, 27) + "..." : r.contact;

        doc.text(r.case_number, marginLeft, cursorY);
        doc.text(matterTrunc, marginLeft + 40, cursorY);
        doc.text(hours.toFixed(2), marginLeft + 120, cursorY);
        doc.text(total.toFixed(2), marginLeft + 150, cursorY);
        doc.text(contactTrunc, marginLeft + 190, cursorY);

        cursorY += 6;
      }

      const pdfBytes = doc.output("arraybuffer");

      return new NextResponse(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${county.name}-report.pdf"`,
        },
      });
    }
  } catch (err) {
    console.error("Unexpected county export error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
