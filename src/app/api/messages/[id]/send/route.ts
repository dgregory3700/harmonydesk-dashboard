// src/app/api/messages/[id]/send/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";

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

function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function sendViaResend(args: {
  to: string[];
  subject: string;
  bodyText: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.HD_EMAIL_FROM;

  if (!apiKey) return { ok: false as const, error: "Missing RESEND_API_KEY" };
  if (!from) return { ok: false as const, error: "Missing HD_EMAIL_FROM" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      text: args.bodyText,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false as const,
      error: `Resend send failed (${res.status})${text ? `: ${text}` : ""}`,
    };
  }

  const json = (await res.json().catch(() => ({}))) as unknown;
  return { ok: true as const, email: json, from };
}

function parseToEmails(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((v: unknown) => String(v ?? "").trim())
      .filter((v: string) => v.length > 0);
  }

  if (typeof input === "string") {
    return input
      .split(/[,\s]+/)
      .map((v: string) => v.trim())
      .filter((v: string) => v.length > 0);
  }

  return [];
}

export async function POST(req: NextRequest, context: IdContext) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;
    const { id } = await context.params;

    const body: any = await req.json().catch(() => ({}));
    const toEmailsArray = parseToEmails(body?.toEmails);

    if (toEmailsArray.length === 0) {
      return NextResponse.json(
        { error: "toEmails is required" },
        { status: 400 }
      );
    }

    const bad = toEmailsArray.find((addr: string) => !isValidEmail(addr));
    if (bad) {
      return NextResponse.json(
        { error: `Invalid recipient email: ${bad}` },
        { status: 400 }
      );
    }

    // Load message (must belong to authed user)
    const { data: found, error: findErr } = await supabase
      .from("messages")
      .select("*")
      .eq("id", id)
      .eq("user_email", userEmail)
      .single();

    if (findErr || !found) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    let message = mapRowToMessage(found);

    // Mark pending + set intended recipients (truthful state even if send fails)
    const toEmailsText = toEmailsArray.join(",");

    const { data: pendingRow, error: pendingErr } = await supabase
      .from("messages")
      .update({
        direction: "email_outbound",
        to_emails: toEmailsText,
        email_status: "pending",
        from_email: process.env.HD_EMAIL_FROM ?? null,
        sent_at: null,
      })
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("*")
      .single();

    if (pendingErr || !pendingRow) {
      console.error("Supabase update (mark pending) error:", pendingErr);
      return NextResponse.json(
        { error: "Failed to update message before sending" },
        { status: 500 }
      );
    }

    message = mapRowToMessage(pendingRow);

    // Send via Resend provider-direct
    const sendRes = await sendViaResend({
      to: toEmailsArray,
      subject: message.subject,
      bodyText: message.body,
    });

    if (!sendRes.ok) {
      const { data: failedRow, error: failUpdErr } = await supabase
        .from("messages")
        .update({
          email_status: "failed",
          from_email: process.env.HD_EMAIL_FROM ?? null,
        })
        .eq("id", id)
        .eq("user_email", userEmail)
        .select("*")
        .single();

      if (failUpdErr) {
        console.error("Supabase update (mark failed) error:", failUpdErr);
      }

      if (failedRow) {
        message = mapRowToMessage(failedRow);
      }

      return NextResponse.json(
        { error: sendRes.error, message },
        { status: 502 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: sentRow, error: sentUpdErr } = await supabase
      .from("messages")
      .update({
        email_status: "sent",
        sent_at: nowIso,
        from_email: sendRes.from,
      })
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("*")
      .single();

    if (sentUpdErr || !sentRow) {
      console.error("Supabase update (mark sent) error:", sentUpdErr);
      return NextResponse.json(
        {
          error:
            "Email may have been sent, but updating message status failed. Check logs.",
          message,
        },
        { status: 502 }
      );
    }

    message = mapRowToMessage(sentRow);

    return NextResponse.json(
      { ok: true, message, email: sendRes.email, provider: "resend" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected POST /api/messages/[id]/send error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
