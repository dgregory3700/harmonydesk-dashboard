import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";

export type CountyReportFormat =
  | "csv_line_per_invoice"
  | "pdf_line_per_invoice"
  | "pdf_grouped_by_case";

export type County = {
  id: string;
  name: string;
  reportFormat: CountyReportFormat;
  nextDueRule: string | null;
};

function mapRow(row: any): County {
  return {
    id: row.id,
    name: row.name,
    reportFormat: row.report_format as CountyReportFormat,
    nextDueRule: row.next_due_rule ?? null,
  };
}

function normalizeReportFormat(raw: unknown): CountyReportFormat | "" {
  const v = String(raw ?? "").trim().toLowerCase();

  if (!v) return "";

  // Legacy / short-hand values from older UI versions
  if (v === "csv") return "csv_line_per_invoice";
  if (v === "pdf") return "pdf_line_per_invoice";

  // Canonical enum values (already correct)
  if (v === "csv_line_per_invoice") return "csv_line_per_invoice";
  if (v === "pdf_line_per_invoice") return "pdf_line_per_invoice";
  if (v === "pdf_grouped_by_case") return "pdf_grouped_by_case";

  return "";
}

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;
    const { supabase, userEmail } = auth;

    const { data, error } = await supabase
      .from("counties")
      .select("*")
      .eq("user_email", userEmail)
      .order("name", { ascending: true });

    if (error) {
      console.error("Supabase GET /api/counties error:", error);
      return NextResponse.json({ error: "Failed to load counties" }, { status: 500 });
    }

    return NextResponse.json((data ?? []).map(mapRow));
  } catch (err) {
    console.error("Unexpected GET /api/counties error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;
    const { supabase, userEmail } = auth;

    const body = await req.json().catch(() => ({}));

    const name = String(body.name ?? "").trim();

    // Accept BOTH camelCase and snake_case payloads
    const reportFormat = normalizeReportFormat(
      body.reportFormat ?? body.report_format
    ) as CountyReportFormat;

    const nextDueRule =
      typeof body.nextDueRule === "string" && body.nextDueRule.trim()
        ? body.nextDueRule.trim()
        : null;

    const allowed: CountyReportFormat[] = [
      "csv_line_per_invoice",
      "pdf_line_per_invoice",
      "pdf_grouped_by_case",
    ];

    if (!name) {
      return NextResponse.json({ error: "Missing county name" }, { status: 400 });
    }

    if (!allowed.includes(reportFormat)) {
      return NextResponse.json({ error: "Invalid report format" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("counties")
      .insert({
        user_email: userEmail,
        name,
        report_format: reportFormat,
        next_due_rule: nextDueRule,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase POST /api/counties error:", error);
      return NextResponse.json({ error: "Failed to create county" }, { status: 500 });
    }

    return NextResponse.json(mapRow(data), { status: 201 });
  } catch (err) {
    console.error("Unexpected POST /api/counties error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
