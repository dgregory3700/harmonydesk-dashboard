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

export async function GET(_req: NextRequest) {
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_email", userEmail)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase GET error:", error);
    return NextResponse.json(
      { error: "Failed to load invoices" },
      { status: 500 }
    );
  }

  const invoices = (data ?? []).map(mapRowToInvoice);
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const caseNumber = String(body.caseNumber ?? "").trim();
  const matter = String(body.matter ?? "").trim();
  const contact = String(body.contact ?? "").trim();
  const hours = Number.parseFloat(body.hours ?? "0");
  const rate = Number.parseFloat(body.rate ?? "0");

  if (!caseNumber || !matter || !contact) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_email: userEmail,
      case_number: caseNumber,
      matter,
      contact,
      hours: Number.isNaN(hours) ? 0 : hours,
      rate: Number.isNaN(rate) ? 0 : rate,
      status: "Draft",
      due: "Draft – set due date",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Supabase POST error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }

  const invoice = mapRowToInvoice(data);
  return NextResponse.json(invoice, { status: 201 });
}
