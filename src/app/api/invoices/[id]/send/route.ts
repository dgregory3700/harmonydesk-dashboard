// src/app/api/invoices/[id]/send/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";

type IdContext = { params: Promise<{ id: string }> };

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

export async function POST(
  _req: NextRequest,
  context: IdContext
) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;
    const { id } = await context.params;

    // Update the invoice status to "Sent"
    const { data, error } = await supabase
      .from("invoices")
      .update({ status: "Sent" })
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase POST /api/invoices/[id]/send error:", error);
      return NextResponse.json(
        { error: "Failed to send invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapRowToInvoice(data));
  } catch (err) {
    console.error("Unexpected POST /api/invoices/[id]/send error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
