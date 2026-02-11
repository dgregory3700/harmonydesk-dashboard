import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type MediationSession = {
  id: string;
  userEmail: string;
  caseId: string;
  date: string;
  durationHours: number;
  notes: string | null;
  completed: boolean;
};

async function requireAuthedSupabase() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false as const,
      res: NextResponse.json(
        { error: "Server misconfigured: missing Supabase env" },
        { status: 500 }
      ),
    };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user?.email) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true as const, supabase, userEmail: user.email };
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
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;
  const { id } = await context.params;

  const { data, error } = await supabase
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
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;
  const { id } = await context.params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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

  const { data, error } = await supabase
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
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;
  const { id } = await context.params;

  const { error } = await supabase
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
}
