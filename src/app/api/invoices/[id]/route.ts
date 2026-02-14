// src/app/api/invoices/[id]/route.ts

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

function isProbablyEmail(value: string) {
  const v = value.trim();
  return v.includes("@") && v.includes(".");
}

function money(n: number) {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildInvoiceEmail(invoice: InvoiceRow) {
  const caseNumber = (invoice.case_number ?? "").trim() || "—";
  const matter = (invoice.matter ?? "").trim() || "—";
  const hours = Number(invoice.hours ?? 0);
  const rate = Number(invoice.rate ?? 0);
  const total = hours * rate;
  const due = (invoice.due ?? "").trim();

  const subject = `Invoice ${caseNumber} — HarmonyDesk`;

  const text =
    `Invoice from HarmonyDesk\n\n` +
    `Case: ${caseNumber}\n` +
    `Matter: ${matter}\n` +
    `Hours: ${hours}\n` +
    `Rate: ${money(rate)}\n` +
    `Total: ${money(total)}\n` +
    (due ? `Due: ${due}\n` : "") +
    `\nIf you have questions, reply to this email.\n`;

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.4">
      <h2 style="margin:0 0 12px 0">Invoice</h2>
      <div style="margin:0 0 8px 0"><strong>Case:</strong> ${escapeHtml(caseNumber)}</div>
      <div style="margin:0 0 8px 0"><strong>Matter:</strong> ${escapeHtml(matter)}</div>
      <div style="margin:0 0 8px 0"><strong>Hours:</strong> ${hours}</div>
      <div style="margin:0 0 8px 0"><strong>Rate:</strong> ${escapeHtml(money(rate))}</div>
      <div style="margin:0 0 8px 0"><strong>Total:</strong> ${escapeHtml(money(total))}</div>
      ${due ? `<div style="margin:0 0 8px 0"><strong>Due:</strong> ${escapeHtml(due)}</div>` : ""}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
      <div style="color:#374151">If you have questions, reply to this email.</div>
    </div>
  `;

  return { subject, text, html };
}

async function sendViaResend(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.HD_EMAIL_FROM;
  const url = process.env.HD_EMAIL_API_URL || "https://api.resend.com/emails";

  if (!apiKey) return { ok: false as const, error: "Missing RESEND_API_KEY" };
  if (!from) return { ok: false as const, error: "Missing HD_EMAIL_FROM" };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });

    const json = await resp.json().catch(() => null);

    if (!resp.ok) {
      const msg =
        (json && (json.error?.message || json.message)) ||
        `Resend error (HTTP ${resp.status})`;
      return { ok: false as const, error: msg, details: json };
    }

    const messageId = json?.id ? String(json.id) : undefined;
    return { ok: true as const, messageId, raw: json };
  } catch (err: any) {
    return {
      ok: false as const,
      error: err?.message ? String(err.message) : "Network error sending email",
    };
  }
}

export async function PATCH(req: NextRequest, context: IdContext) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;
    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));
    const status = body.status as InvoiceStatus | undefined;

    if (!status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }

    // If attempting to mark Sent, make it REAL:
    if (status === "Sent") {
      // 1) Load invoice (scoped to user)
      const { data: invoice, error: loadErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .eq("user_email", userEmail)
        .single();

      if (loadErr || !invoice) {
        console.error("Supabase load invoice for send error:", loadErr);
        return NextResponse.json(
          { error: "Failed to load invoice" },
          { status: 500 }
        );
      }

      const row = invoice as InvoiceRow;

      // 2) Enforce honest lifecycle
      const currentStatus = String(row.status ?? "Draft") as InvoiceStatus;
      if (currentStatus !== "Draft") {
        return NextResponse.json(
          { error: "Only Draft invoices can be sent" },
          { status: 409 }
        );
      }

      // 3) Determine recipient email
      const toEmailRaw =
        typeof body.toEmail === "string" ? body.toEmail.trim() : "";
      const contactRaw = String(row.contact ?? "").trim();

      const toEmail =
        toEmailRaw && isProbablyEmail(toEmailRaw)
          ? toEmailRaw
          : contactRaw && isProbablyEmail(contactRaw)
          ? contactRaw
          : "";

      if (!toEmail) {
        return NextResponse.json(
          {
            error:
              "Missing recipient email. Provide body.toEmail or store an email in invoice.contact.",
          },
          { status: 400 }
        );
      }

      // 4) Build + send
      const { subject, text, html } = buildInvoiceEmail(row);
      const send = await sendViaResend({ to: toEmail, subject, text, html });

      if (!send.ok) {
        console.error("Invoice email send failed:", {
          invoice_id: id,
          provider: "resend",
          error: send.error,
          details: (send as any).details,
        });

        // IMPORTANT: do NOT mutate invoice status on failure
        return NextResponse.json(
          {
            error: "EMAIL_SEND_FAILED",
            provider: "resend",
            message: send.error,
          },
          { status: 502 }
        );
      }

      console.log("Invoice email sent:", {
        invoice_id: id,
        provider: "resend",
        messageId: send.messageId,
        to: toEmail,
      });

      // 5) Now and only now: mark Sent
      const { data: updated, error: updateErr } = await supabase
        .from("invoices")
        .update({ status: "Sent" })
        .eq("id", id)
        .eq("user_email", userEmail)
        .select("*")
        .single();

      if (updateErr || !updated) {
        console.error(
          "Supabase update invoice to Sent failed AFTER email send:",
          updateErr
        );
        return NextResponse.json(
          {
            error: "DB_UPDATE_FAILED_AFTER_EMAIL",
            provider: "resend",
            messageId: send.messageId,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        invoice: mapRowToInvoice(updated),
        email: { provider: "resend", messageId: send.messageId, to: toEmail },
      });
    }

    // Non-sent status updates remain simple and deterministic
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

export async function DELETE(_req: NextRequest, context: IdContext) {
  try {
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
