import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";

export type MediationSession = {
  id: string;
  userEmail: string;
  caseId: string;
  date: string; // ISO
  durationHours: number;
  notes: string | null;
  completed: boolean;
};

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
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;

  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");

  let query = supabase
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
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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

  const { data, error } = await supabase
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
}
