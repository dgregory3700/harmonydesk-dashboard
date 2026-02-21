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

function n(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function csvEscape(cell: any) {
  return `"${String(cell ?? "").replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest, context: IdContext) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;
    const { supabase, userEmail } = auth;

    const { id: countyId } = await context.params;

    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "csv").toLowerCase();
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

    if (format === "csv") {
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
          ].map(csvEscape).join(",");
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

    if (format === "pdf") {
      // Simple deterministic PDF (line-per-invoice)
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

    return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
  } catch (err) {
    console.error("Unexpected county export error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
