import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseServer";

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

function getUserEmail() {
  const store = cookies();
  return store.get("hd_user_email")?.value || null;
}

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
  { params }: { params: { id: string } }
) {
  const userEmail = getUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json();

  const update: Record<string, any> = {};

  if (body.status) {
    update.status = body.status as InvoiceStatus;
    // simple due text tweak
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

  const { data, error } = await supabaseAdmin
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
