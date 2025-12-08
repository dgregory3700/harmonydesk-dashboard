import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseServer";

export type MessageDirection = "internal" | "email_outbound";

export type Message = {
  id: string;
  userEmail: string;
  caseId: string | null;
  subject: string;
  body: string;
  createdAt: string;
  direction: MessageDirection;
  toEmails: string[] | null;
  fromEmail: string | null;
  sentAt: string | null;
  emailStatus: "pending" | "sent" | "failed" | null;
};

// NOTE: cookies() is async in recent Next.js
async function getUserEmail() {
  const cookieStore = await cookies();

  const candidate =
    cookieStore.get("hd_user_email") ||
    cookieStore.get("hd-user-email") ||
    cookieStore.get("user_email") ||
    cookieStore.get("userEmail") ||
    cookieStore.get("email");

  if (candidate?.value) {
    return candidate.value;
  }

  // fallback single dev mediator
  return "dev-mediator@harmonydesk.local";
}

function mapRowToMessage(row: any): Message {
  const toRaw = row.to_emails as string | null;
  const toEmails =
    toRaw && typeof toRaw === "string"
      ? toRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

  return {
    id: row.id,
    userEmail: row.user_email,
    caseId: row.case_id ?? null,
    subject: row.subject,
    body: row.body,
    createdAt: row.created_at,
    direction: (row.direction as MessageDirection) || "internal",
    toEmails,
    fromEmail: row.from_email ?? null,
    sentAt: row.sent_at ?? null,
    emailStatus: (row.email_status as any) ?? null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const userEmail = await getUserEmail();
    const url = new URL(req.url);
    const caseId = url.searchParams.get("caseId");
    const search = (url.searchParams.get("search") || "")
      .toLowerCase()
      .trim();

    let query = supabaseAdmin
      .from("messages")
      .select("*")
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

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
    const userEmail = await getUserEmail();
    const body = await req.json();

    const subject = String(body.subject ?? "").trim();
    const messageBody = String(body.body ?? "").trim();
    const caseId =
      body.caseId && String(body.caseId).trim()
        ? String(body.caseId).trim()
        : null;

    const sendAsEmail = !!body.sendAsEmail;
    const toEmailRaw = String(body.toEmail ?? "").trim();
    const toEmail = sendAsEmail && toEmailRaw ? toEmailRaw : null;

    if (!subject || !messageBody) {
      return NextResponse.json(
        { error: "Subject and message body are required" },
        { status: 400 }
      );
    }

    if (sendAsEmail && !toEmail) {
      return NextResponse.json(
        { error: "To email is required when sending as email" },
        { status: 400 }
      );
    }

    const direction: MessageDirection = sendAsEmail
      ? "email_outbound"
      : "internal";
    const to_emails = toEmail ? toEmail : null;

    // 1) Insert the message row
    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert({
        user_email: userEmail,
        case_id: caseId,
        subject,
        body: messageBody,
        direction,
        to_emails,
        from_email: sendAsEmail ? userEmail : null,
        email_status: sendAsEmail ? "pending" : null,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase POST /api/messages insert error:", error);
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 }
      );
    }

    const createdId = data.id as string;

    // 2) Optionally send email via backend /email/send
    if (sendAsEmail && toEmail) {
      const emailEndpoint =
        process.env.HD_EMAIL_API_URL ||
        "https://api.harmonydesk.ai/email/send";

      try {
        const emailRes = await fetch(emailEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject,
            body: messageBody,
            to: [toEmail],
            caseId: createdId,
          }),
        });

        if (!emailRes.ok) {
          console.error("Email send failed with status:", emailRes.status);
          await supabaseAdmin
            .from("messages")
            .update({ email_status: "failed" })
            .eq("id", createdId);
        } else {
          await supabaseAdmin
            .from("messages")
            .update({
              email_status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", createdId);
        }
      } catch (err) {
        console.error("Error calling backend /email/send:", err);
        await supabaseAdmin
          .from("messages")
          .update({ email_status: "failed" })
          .eq("id", createdId);
      }
    }

    const message = mapRowToMessage({
      ...data,
      email_status: sendAsEmail ? "sent" : data.email_status,
      sent_at: sendAsEmail ? new Date().toISOString() : data.sent_at,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("Unexpected POST /api/messages error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
