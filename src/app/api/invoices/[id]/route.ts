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
    hours: Number(row.hours || 0),
    rate: Number(row.rate || 0),
    status: row.status as InvoiceStatus,
    due: row.due,
  };
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;
  const { id } = await context.params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, any> = {};

  if (body.status) {
    update.status = body.status as InvoiceStatus;
    if (body.status === "Draft") {
      update.due = "Draft – set due date";
    } else if (body.status === "Sent") {
      update.due = "Sent – awaiting payment";
    } else if (body.status === "For county report") {
      update.due = "Included in month-end county report";
    }
  }

  if (body.due) {
    update.due = String(body.due);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("invoices")
    .update(update)
    .eq("id", id)
    .eq("user_email", userEmail)
    .select("*")
    .single();

  if (error || !data) {
    console.error("Supabase PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }

  const invoice = mapRowToInvoice(data);
  return NextResponse.json(invoice);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;
  const { id } = await context.params;

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("user_email", userEmail);

  if (error) {
    console.error("Supabase DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
