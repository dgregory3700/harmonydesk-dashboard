import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseServer";

export type MediationSession = {
  id: string;
  userEmail: string;
  caseId: string;
  date: string; // ISO
  durationHours: number;
  notes: string | null;
  completed: boolean;
};

// NOTE: cookies() is async in recent Next.js
async function getUserEmail() {
  const cookieStore = await cookies();

  // Debug: log everything we see
  const all = cookieStore.getAll();
  console.log("cookies seen in /api/sessions:", all);

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

function mapRowToSession(row: any): MediationSession {
  return {
    id: row.id,
    userEmail: row.user_email,
    caseId: row.case_id,
    date: row.date,
    durationHours: Number(row.duration_hours || 0),
    notes: row.notes ?? null,
    completed: Boolean(row.completed),
  };
}

export async function GET(req: NextRequest) {
  try {
    const userEmail = await getUserEmail();
    const url = new URL(req.url);
    const caseId = url.searchParams.get("caseId");

    let query = supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("user_email", userEmail)
      .order("date", { ascending: false });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase GET /api/sessions error:", error);
      return NextResponse.json(
        { error: "Failed to load sessions" },
        { status: 500 }
      );
    }

    const sessions = (data ?? []).map(mapRowToSession);
    return NextResponse.json(sessions);
  } catch (err) {
    console.error("Unexpected GET /api/sessions error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userEmail = await getUserEmail();
    const body = await req.json();

    const caseId = String(body.caseId ?? "").trim();
    const date = String(body.date ?? "").trim();
    const durationHoursRaw = body.durationHours ?? body.duration_hours ?? 1;
    const notes =
      body.notes && String(body.notes).trim()
        ? String(body.notes)
        : null;
    const completed = Boolean(body.completed ?? false);

    const durationHours = Number.parseFloat(String(durationHoursRaw));

    if (!caseId || !date) {
      return NextResponse.json(
        { error: "Missing required fields: caseId and date" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("sessions")
      .insert({
        user_email: userEmail,
        case_id: caseId,
        date,
        duration_hours: Number.isNaN(durationHours) ? 1 : durationHours,
        notes,
        completed,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase POST /api/sessions error:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    const session = mapRowToSession(data);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    console.error("Unexpected POST /api/sessions error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
