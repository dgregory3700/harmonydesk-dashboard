import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";
import type { CountyReportFormat } from "../route";

type IdContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: IdContext) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;
    const { supabase, userEmail } = auth;

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const update: Record<string, any> = {};

    if ("name" in body) update.name = String(body.name ?? "").trim() || null;

    if ("reportFormat" in body) {
      const rf = String(body.reportFormat ?? "").trim() as CountyReportFormat;
      const allowed: CountyReportFormat[] = [
        "csv_line_per_invoice",
        "pdf_line_per_invoice",
        "pdf_grouped_by_case",
      ];
      if (!allowed.includes(rf)) {
        return NextResponse.json({ error: "Invalid report format" }, { status: 400 });
      }
      update.report_format = rf;
    }

    if ("nextDueRule" in body) {
      update.next_due_rule =
        typeof body.nextDueRule === "string" && body.nextDueRule.trim()
          ? body.nextDueRule.trim()
          : null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("counties")
      .update(update)
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Supabase PATCH /api/counties/[id] error:", error);
      return NextResponse.json({ error: "Failed to update county" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "County not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      reportFormat: data.report_format,
      nextDueRule: data.next_due_rule ?? null,
    });
  } catch (err) {
    console.error("Unexpected PATCH /api/counties/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: IdContext) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;
    const { supabase, userEmail } = auth;

    const { id } = await context.params;

    // Prevent silent success: confirm a row was deleted
    const { data, error } = await supabase
      .from("counties")
      .delete()
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Supabase DELETE /api/counties/[id] error:", error);
      return NextResponse.json({ error: "Failed to delete county" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "County not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unexpected DELETE /api/counties/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
