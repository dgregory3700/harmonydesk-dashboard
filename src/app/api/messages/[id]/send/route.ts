// src/app/api/messages/[id]/send/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";
import { resolve4, resolve6, resolveMx } from "dns/promises";

export const runtime = "nodejs"; // required for dns/promises on Vercel

type IdContext = { params: Promise<{ id: string }> };

type MessageDirection = "internal" | "email_outbound";

type Message = {
  id: string;
  userEmail: string;
  caseId: string | null;
  subject: string;
  body: string;
  createdAt: string;

  direction: MessageDirection;
  to_emails: string | null;
  from_email: string | null;
  sent_at: string | null;
  email_status: "pending" | "sent" | "failed" | null;
};

function mapRowToMessage(row: any): Message {
  return {
    id: row.id,
    userEmail: row.user_email,
    caseId: row.case_id ?? null,
    subject: row.subject,
    body: row.body,
    createdAt: row.created_at,

    direction: (row.direction as MessageDirection) ?? "internal",
    to_emails: row.to_emails ?? null,
    from_email: row.from_email ?? null,
    sent_at: row.sent_at ?? null,
    email_status:
      (row.email_status as "pending" | "sent" | "failed" | null) ?? null,
  };
}

// Syntax-only email validation
function isValidEmailSyntax(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return false;
  const domain = v.split("@")[1] || "";
  if (domain.includes("..")) return false;
  return true;
}

// Deliverability-ish validation: domain must resolve (MX preferred, A/AAAA fallback)
async function domainLooksRoutable(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;

  try {
    const mx = await resolveMx(domain).catch(() => []);
    if (mx && mx.length > 0) return true;

    const a4 = await resolve4(domain).catch(() => []);
    if (a4 && a4.length > 0) return true;

    const a6 = await resolve6(domain).catch(() => []);
    if (a6 && a6.length > 0) return true;

    return false;
  } catch {
    return false;
  }
}

async function sendViaResend(args: {
  to: string;
  subject: string;
  text: string;
  replyTo: string; // mediator email
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.HD_EMAIL_FROM;
  const url = process.env.HD_EMAIL_API_URL || "https://api.resend.com/emails";

  if (!apiKey) return { ok: false as const, error: "Missing RESEND_API_KEY" };
  if (!from) return { ok: false as const, error: "Missing HD_EMAIL_FROM" };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

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
        text: args.text,
        reply_to: args.replyTo, // replies go to mediator inbox
      }),
      signal: controller.signal,
    });

    const json = await resp.json().catch(() => null);

    if (!resp.ok) {
      const msg =
        (json && (json.error?.message || json.message)) ||
        `Resend error (HTTP ${resp.status})`;
      return { ok: false as const, error: msg, details: json };
    }

    const messageId = json?.id ? String(json.id) : undefined;
    return { ok: true as const, messageId, raw: json, from };
  } catch (err: any) {
    const msg =
      err?.name === "AbortError"
        ? "Email service request timed out"
        : err?.message
        ? String(err.message)
        : "Network error sending email";
    return { ok: false as const, error: msg };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req: NextRequest, context: IdContext) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;
    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));
    const toEmail = typeof body.toEmail === "string" ? body.toEmail.trim() : "";

    if (!toEmail) {
      return NextResponse.json(
        { error: "Missing recipient email (toEmail)" },
        { status: 400 }
      );
    }

    if (!isValidEmailSyntax(toEmail)) {
      return NextResponse.json(
        { error: "Invalid recipient email address" },
        { status: 400 }
      );
    }

    const routable = await domainLooksRoutable(toEmail);
    if (!routable) {
      return NextResponse.json(
        { error: "Recipient email domain does not appear to accept mail" },
        { status: 400 }
      );
    }

    // 1) Load message (scoped)
    const { data: row, error: fetchError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", id)
      .eq("user_email", userEmail)
      .single();

    if (fetchError || !row) {
      console.error("Supabase POST /api/messages/[id]/send fetch error:", fetchError);
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    let message = mapRowToMessage(row);

    // 2) Send email via Resend provider-direct (Reply-To = mediator)
    const send = await sendViaResend({
      to: toEmail,
      subject: message.subject,
      text: message.body,
      replyTo: userEmail,
    });

    if (!send.ok) {
      // Persist truthful failure
      const { data: updated } = await supabase
        .from("messages")
        .update({
          direction: "email_outbound",
          to_emails: toEmail,
          email_status: "failed",
          from_email: process.env.HD_EMAIL_FROM ?? null,
        })
        .eq("id", id)
        .eq("user_email", userEmail)
        .select("*")
        .single()
        .catch(() => ({ data: null as any }));

      if (updated) message = mapRowToMessage(updated);

      return NextResponse.json(
        { error: send.error, provider: "resend", message },
        { status: 502 }
      );
    }

    const nowIso = new Date().toISOString();

    // 3) Persist truthful success
    const { data: updated, error: updateErr } = await supabase
      .from("messages")
      .update({
        direction: "email_outbound",
        to_emails: toEmail,
        email_status: "sent",
        sent_at: nowIso,
        from_email: send.from,
      })
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("*")
      .single();

    if (updateErr || !updated) {
      console.error("Supabase update after message send failed:", updateErr);
      // Email may have been sent, but DB state is not updated => do not claim success
      return NextResponse.json(
        {
          error:
            "Email may have been sent, but updating message status failed. Check logs.",
          provider: "resend",
          message,
        },
        { status: 502 }
      );
    }

    message = mapRowToMessage(updated);

    return NextResponse.json(
      {
        ok: true,
        provider: "resend",
        message,
        email: { messageId: send.messageId, to: toEmail, replyTo: userEmail, from: send.from },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected POST /api/messages/[id]/send error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
