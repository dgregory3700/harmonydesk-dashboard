// src/app/api/messages/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";

export type MessageDirection = "internal" | "email_outbound";

export type Message = {
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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;

    const url = new URL(req.url);
    const caseId = url.searchParams.get("caseId");
    const search = (url.searchParams.get("search") || "").toLowerCase().trim();

    let query = supabase
      .from("messages")
      .select("*")
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });

    if (caseId) query = query.eq("case_id", caseId);

    const { data, error } = await query;

    if (error) {
      console.error("Supabase GET /api/messages error:", error);
      return NextResponse.json(
        { error: "Failed to load messages" },
        { status: 500 }
      );
    }

    let messages = (data ?? []).map(mapRowToMessage);

    if (search) {
      messages = messages.filter((m) => {
        const haystack = (m.subject + " " + m.body).toLowerCase();
        return haystack.includes(search);
      });
    }

    return NextResponse.json(messages);
  } catch (err) {
    console.error("Unexpected GET /api/messages error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;

    const body: any = await req.json();

    const subject = String(body.subject ?? "").trim();
    const messageBody = String(body.body ?? "").trim();
    const caseId =
      body.caseId && String(body.caseId).trim()
        ? String(body.caseId).trim()
        : null;

    if (!subject || !messageBody) {
      return NextResponse.json(
        { error: "Subject and message body are required" },
        { status: 400 }
      );
    }

    const sendAsEmail = !!body.sendAsEmail;

    // Accept toEmails as array, or comma/space-separated string.
    let toEmailsArray: string[] = [];

    if (Array.isArray(body.toEmails)) {
      toEmailsArray = body.toEmails
        .map((v: unknown) => String(v ?? "").trim())
        .filter((v: string) => v.length > 0);
    } else if (typeof body.toEmails === "string") {
      toEmailsArray = body.toEmails
        .split(/[,\s]+/)
        .map((v: string) => v.trim())
        .filter((v: string) => v.length > 0);
    }

    if (sendAsEmail) {
      if (toEmailsArray.length === 0) {
        return NextResponse.json(
          { error: "toEmails is required when sendAsEmail is true" },
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
    }

    const direction: MessageDirection = sendAsEmail
      ? "email_outbound"
      : "internal";

    const toEmailsText = toEmailsArray.length ? toEmailsArray.join(",") : null;

    const insertPayload: Record<string, unknown> = {
      user_email: userEmail,
      case_id: caseId,
      subject,
      body: messageBody,
      direction,
      to_emails: toEmailsText,
      email_status: sendAsEmail ? "pending" : null,
      from_email: null,
      sent_at: null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("messages")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error("Supabase POST /api/messages insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 }
      );
    }

    let message = mapRowToMessage(inserted);

    if (sendAsEmail) {
      const sendRes = await sendViaResend({
        to: toEmailsArray,
        subject,
        bodyText: messageBody,
      });

      if (!sendRes.ok) {
        // Persist truthful failure state (best-effort).
        const { data: updated, error: updateFailErr } = await supabase
          .from("messages")
          .update({
            email_status: "failed",
            from_email: process.env.HD_EMAIL_FROM ?? null,
          })
          .eq("id", message.id)
          .eq("user_email", userEmail)
          .select("*")
          .single();

        if (updateFailErr) {
          console.error(
            "Supabase update (mark email failed) error:",
            updateFailErr
          );
        }

        if (updated) {
          message = mapRowToMessage(updated);
        }

        return NextResponse.json(
          { error: sendRes.error, message },
          { status: 502 }
        );
      }

      const nowIso = new Date().toISOString();

      const { data: updated, error: updateErr } = await supabase
        .from("messages")
        .update({
          email_status: "sent",
          sent_at: nowIso,
          from_email: sendRes.from,
        })
        .eq("id", message.id)
        .eq("user_email", userEmail)
        .select("*")
        .single();

      if (updateErr || !updated) {
        console.error("Supabase update after Resend send failed:", updateErr);
        return NextResponse.json(
          {
            error:
              "Email may have been sent, but updating message status failed. Check logs.",
            message,
          },
          { status: 502 }
        );
      }

      message = mapRowToMessage(updated);

      return NextResponse.json(
        { ok: true, message, email: sendRes.email, provider: "resend" },
        { status: 201 }
      );
    }

    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (err) {
    console.error("Unexpected POST /api/messages error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
