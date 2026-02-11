import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CaseStatus = "Open" | "Upcoming" | "Closed";

type MediationCase = {
  id: string;
  caseNumber: string;
  matter: string;
  parties: string;
  county: string;
  status: CaseStatus;
  nextSessionDate: string | null;
  notes: string | null;
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

function mapRowToCase(row: any): MediationCase {
  return {
    id: row.id,
    caseNumber: row.case_number,
    matter: row.matter,
    parties: row.parties,
    county: row.county,
    status: row.status as CaseStatus,
    nextSessionDate: row.next_session_date ?? null,
    notes: row.notes ?? null,
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
    .from("cases")
    .select("*")
    .eq("id", id)
    .eq("user_email", userEmail)
    .single();

  if (error || !data) {
    console.error("Supabase GET case error:", error);
    return NextResponse.json(
      { error: "Case not found" },
      { status: 404 }
    );
  }

  const mediationCase = mapRowToCase(data);
  return NextResponse.json(mediationCase);
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

  if (body.caseNumber !== undefined) {
    update.case_number = String(body.caseNumber).trim();
  }
  if (body.matter !== undefined) {
    update.matter = String(body.matter).trim();
  }
  if (body.parties !== undefined) {
    update.parties = String(body.parties).trim();
  }
  if (body.county !== undefined) {
    update.county = String(body.county).trim();
  }
  if (body.status !== undefined) {
    update.status = body.status as CaseStatus;
  }
  if (body.nextSessionDate !== undefined) {
    const val = String(body.nextSessionDate).trim();
    update.next_session_date = val || null;
  }
  if (body.notes !== undefined) {
    const val = String(body.notes).trim();
    update.notes = val || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("cases")
    .update(update)
    .eq("id", id)
    .eq("user_email", userEmail)
    .select("*")
    .single();

  if (error || !data) {
    console.error("Supabase PATCH case error:", error);
    return NextResponse.json(
      { error: "Failed to update case" },
      { status: 500 }
    );
  }

  const mediationCase = mapRowToCase(data);
  return NextResponse.json(mediationCase);
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
    .from("cases")
    .delete()
    .eq("id", id)
    .eq("user_email", userEmail);

  if (error) {
    console.error("Supabase DELETE case error:", error);
    return NextResponse.json(
      { error: "Failed to delete case" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
