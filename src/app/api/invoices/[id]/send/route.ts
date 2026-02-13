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

export async function POST(_req: NextRequest, context: IdContext) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;
    const { id } = await context.params;

    // 1) Load invoice (scoped to authed user)
    const { data: invoiceRow, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("user_email", userEmail)
      .single();

    if (fetchError || !invoiceRow) {
      console.error("Supabase POST /api/invoices/[id]/send fetch error:", fetchError);
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const invoice = mapRowToInvoice(invoiceRow);

    // 2) Resolve email endpoint (match existing /api/send-email behavior)
    const emailEndpoint =
      process.env.HD_EMAIL_API_URL || "https://api.harmonydesk.ai/email/send";

    // 3) Prepare payload
    // NOTE: This matches the known external endpoint (/email/send). If your external API
    // expects a different shape, align it to whatever /api/send-email uses.
    const payload = {
      type: "invoice",
      userEmail,
      invoice: {
        id: invoice.id,
        caseNumber: invoice.caseNumber,
        matter: invoice.matter,
        contact: invoice.contact,
        hours: invoice.hours,
        rate: invoice.rate,
        due: invoice.due,
      },
    };

    // 4) POST to external email API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let res: Response;
    try {
      res = await fetch(emailEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      console.error("Fetch to email API failed:", fetchErr);
      const msg =
        fetchErr?.name === "AbortError"
          ? "Email service request timed out"
          : "Failed to send invoice email";
      return NextResponse.json({ error: msg }, { status: 502 });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("External email API failed:", res.status, text || "(no body)");
      return NextResponse.json({ error: "Failed to send invoice email" }, { status: 502 });
    }

    // 5) Only after successful send: update status to Sent
    const { data: updatedRow, error: updateError } = await supabase
      .from("invoices")
      .update({ status: "Sent" })
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("*")
      .single();

    if (updateError || !updatedRow) {
      console.error("Failed to update invoice status after send:", updateError);
      return NextResponse.json(
        { error: "Invoice sent but failed to update status" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapRowToInvoice(updatedRow));
  } catch (err) {
    console.error("Unexpected POST /api/invoices/[id]/send error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
