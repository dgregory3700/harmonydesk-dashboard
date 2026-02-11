import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";

type InvoiceStatus = "Draft" | "Sent" | "For county report";

type Invoice = {
  id: string;
  caseNumber: string;
  matter: string;
  contact: string;
  hours: number;
  rate: number;
  status: InvoiceStatus;
  due: string;
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
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { id } = await params;
    const { supabase, userEmail } = auth;

    const body = await req.json();
    const status = body.status as InvoiceStatus | undefined;

    if (!status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("invoices")
      .update({ status })
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase PATCH /api/invoices/[id] error:", error);
      return NextResponse.json(
        { error: "Failed to update invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapRowToInvoice(data));
  } catch (err) {
    console.error("Unexpected PATCH /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { id } = await params;
    const { supabase, userEmail } = auth;

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id)
      .eq("user_email", userEmail);

    if (error) {
      console.error("Supabase DELETE /api/invoices/[id] error:", error);
      return NextResponse.json(
        { error: "Failed to delete invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unexpected DELETE /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
