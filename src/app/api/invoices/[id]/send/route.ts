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

    // Load invoice from database
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("user_email", userEmail)
      .single();

    if (fetchError || !invoice) {
      console.error("Supabase POST /api/invoices/[id]/send error:", fetchError);
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Validate HD_EMAIL_API_URL exists
    const emailApiUrl = process.env.HD_EMAIL_API_URL;
    if (!emailApiUrl) {
      console.error("HD_EMAIL_API_URL environment variable is not configured");
      return NextResponse.json(
        { error: "Email service is not configured. Please set HD_EMAIL_API_URL environment variable." },
        { status: 500 }
      );
    }

    // Prepare invoice payload
    const invoiceData = mapRowToInvoice(invoice);
    const payload = {
      userEmail,
      invoice: {
        id: invoiceData.id,
        caseNumber: invoiceData.caseNumber,
        matter: invoiceData.matter,
        contact: invoiceData.contact,
        hours: invoiceData.hours,
        rate: invoiceData.rate,
        due: invoiceData.due,
      },
    };

    // POST to external email API with timeout
    const emailEndpoint = `${emailApiUrl}/invoice/send`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let res;
    try {
      res = await fetch(emailEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.error("Fetch to email API failed:", fetchErr);
      return NextResponse.json(
        { error: fetchErr.name === "AbortError" ? "Email service request timed out" : "Failed to send invoice email" },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "External email API failed:",
        res.status,
        text || "(no body)"
      );
      return NextResponse.json(
        { error: "Failed to send invoice email" },
        { status: 502 }
      );
    }

    // Update invoice status to "Sent"
    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update({ status: "Sent" })
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("*")
      .single();

    if (updateError || !updatedInvoice) {
      console.error("Failed to update invoice status:", updateError);
      return NextResponse.json(
        { error: "Invoice sent but failed to update status" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapRowToInvoice(updatedInvoice));
  } catch (err) {
    console.error("Unexpected POST /api/invoices/[id]/send error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
