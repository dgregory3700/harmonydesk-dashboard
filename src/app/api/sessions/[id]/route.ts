import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseServer";

type MediationSession = {
  id: string;
  userEmail: string;
  caseId: string;
  date: string;
  durationHours: number;
  notes: string | null;
  completed: boolean;
};

// NOTE: cookies() is async in recent Next.js
async function getUserEmail() {
  const cookieStore = await cookies();

  // Debug: log everything we see
  const all = cookieStore.getAll();
  console.log("cookies seen in /api/sessions/[id]:", all);

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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userEmail = await getUserEmail();

    console.log("GET /api/sessions/[id]", { id, userEmail });

    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("id", id)
      .eq("user_email", userEmail)
      .single();

    if (error || !data) {
      console.error("Supabase GET session error:", error);
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const session = mapRowToSession(data);
    return NextResponse.json(session);
  } catch (err) {
    console.error("Unexpected GET /api/sessions/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userEmail = await getUserEmail();
    const body = await req.json();

    const update: Record<string, any> = {};

    if (body.date !== undefined) {
      update.date = String(body.date).trim();
    }

    if (body.durationHours !== undefined || body.duration_hours !== undefined) {
      const raw = body.durationHours ?? body.duration_hours;
      const parsed = Number.parseFloat(String(raw));
      update.duration_hours = Number.isNaN(parsed) ? 1 : parsed;
    }

    if (body.notes !== undefined) {
      const val = String(body.notes).trim();
      update.notes = val || null;
    }

    if (body.completed !== undefined) {
      update.completed = Boolean(body.completed);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    console.log("PATCH /api/sessions/[id]", { id, userEmail, update });

    const { data, error } = await supabaseAdmin
      .from("sessions")
      .update(update)
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase PATCH session error:", error);
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }

    const session = mapRowToSession(data);
    return NextResponse.json(session);
  } catch (err) {
    console.error("Unexpected PATCH /api/sessions/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userEmail = await getUserEmail();

    console.log("DELETE /api/sessions/[id]", { id, userEmail });

    const { error } = await supabaseAdmin
      .from("sessions")
      .delete()
      .eq("id", id)
      .eq("user_email", userEmail);

    if (error) {
      console.error("Supabase DELETE session error:", error);
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Unexpected DELETE /api/sessions/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
