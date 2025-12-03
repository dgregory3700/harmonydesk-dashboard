import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseServer";

export type Message = {
  id: string;
  userEmail: string;
  caseId: string | null;
  subject: string;
  body: string;
  createdAt: string;
};

// NOTE: cookies() is async in recent Next.js
async function getUserEmail() {
  const cookieStore = await cookies();

  // Debug: log everything we see
  const all = cookieStore.getAll();
  console.log("cookies seen in /api/messages:", all);

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
  return {
    id: row.id,
    userEmail: row.user_email,
    caseId: row.case_id ?? null,
    subject: row.subject,
    body: row.body,
    createdAt: row.created_at,
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

    if (!subject || !messageBody) {
      return NextResponse.json(
        { error: "Subject and message body are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert({
        user_email: userEmail,
        case_id: caseId,
        subject,
        body: messageBody,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase POST /api/messages error:", error);
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 }
      );
    }

    const message = mapRowToMessage(data);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("Unexpected POST /api/messages error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
