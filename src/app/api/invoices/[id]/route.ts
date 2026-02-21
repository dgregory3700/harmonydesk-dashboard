import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";

type IdContext = { params: Promise<{ id: string }> };

type InvoiceStatus = "Draft" | "Sent" | "For county report";

type InvoiceRow = {
  id: string;
  user_email: string;
  case_number: string | null;
  matter: string | null;
  contact: string | null;
  hours: number | null;
  rate: number | null;
  status: string | null;
  due: string | null;
  county_id: string | null;
};

type Invoice = {
  id: string;
  caseNumber: string;
  matter: string;
  contact: string;
  hours: number;
  rate: number;
  status: InvoiceStatus;
  due: string;
  countyId: string | null;
};

function mapRowToInvoice(row: any): Invoice {
  return {
    id: row.id,
    caseNumber: row.case_number,
    matter: row.matter,
    contact: row.contact,
    hours: Number(row.hours ?? 0),
    rate: Number(row.rate ?? 0),
    status: row.status as InvoiceStatus,
    due: row.due ?? "",
    countyId: row.county_id ?? null,
  };
}

export async function PATCH(req: NextRequest, context: IdContext) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;
    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));

    const status = body.status as InvoiceStatus | undefined;
    const countyId =
      typeof body.countyId === "string"
        ? body.countyId.trim() || null
        : undefined; // undefined means "not provided"

    if (!status && countyId === undefined) {
      return NextResponse.json(
        { error: "Missing status or countyId" },
        { status: 400 }
      );
    }

    // Guard: Sent is NOT a simple PATCH here; sending must go through /send
    if (status === "Sent") {
      return NextResponse.json(
        { error: "Use /api/invoices/[id]/send to send invoices" },
        { status: 409 }
      );
    }

    const update: Record<string, any> = {};

    if (status) {
      if (status !== "Draft" && status !== "For county report") {
        return NextResponse.json(
          { error: "Invalid status update" },
          { status: 400 }
        );
      }
      update.status = status;
    }

    if (countyId !== undefined) {
      update.county_id = countyId; // may be null to unassign
    }

    const { data, error } = await supabase
      .from("invoices")
      .update(update)
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Supabase PATCH /api/invoices/[id] error:", error);
      return NextResponse.json(
        { error: "Failed to update invoice" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(mapRowToInvoice(data));
  } catch (err) {
    console.error("Unexpected PATCH /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: IdContext) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;
    const { id } = await context.params;

    // No silent success: confirm a row was deleted
    const { data, error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Supabase DELETE /api/invoices/[id] error:", error);
      return NextResponse.json(
        { error: "Failed to delete invoice" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unexpected DELETE /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
