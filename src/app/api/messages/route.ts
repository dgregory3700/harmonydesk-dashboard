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

  // Email-related fields (optional for existing data)
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

    // Email-related fields with safe fallbacks for older rows
    direction: (row.direction as MessageDirection) ?? "internal",
    to_emails: row.to_emails ?? null,
    from_email: row.from_email ?? null,
    sent_at: row.sent_at ?? null,
    email_status:
      (row.email_status as "pending" | "sent" | "failed" | null) ?? null,
  };
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
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;

    const body = await req.json();

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

    // These fields are coming from the New Message form via MessagesNewClient.tsx
    const sendAsEmail = !!body.sendAsEmail;
    const directionRaw = body.direction as MessageDirection | undefined;
    const direction: MessageDirection =
      directionRaw === "email_outbound" ? "email_outbound" : "internal";

    const toEmailsArray: string[] = Array.isArray(body.toEmails)
      ? body.toEmails
      : [];

    // Store as comma-separated string for now; easy to query and display.
    const toEmailsText =
      toEmailsArray.length > 0 ? toEmailsArray.join(",") : null;

    const insertPayload: any = {
      user_email: userEmail,
      case_id: caseId,
      subject,
      body: messageBody,
      direction,
      to_emails: toEmailsText,
      email_status: sendAsEmail ? "pending" : null,
    };

    const { data, error } = await supabase
      .from("messages")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase POST /api/messages error:", error);
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapRowToMessage(data), { status: 201 });
  } catch (err) {
    console.error("Unexpected POST /api/messages error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
