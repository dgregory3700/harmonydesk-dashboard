import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CaseStatus = "Open" | "Upcoming" | "Closed";

export type MediationCase = {
  id: string;
  caseNumber: string;
  matter: string;
  parties: string;
  county: string;
  status: CaseStatus;
  nextSessionDate: string | null;
  notes: string | null;
};

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

/**
 * Production rule:
 * - derive user from Supabase SSR cookies
 * - if missing => 401 (NO fallback identity)
 * - use ANON client so RLS is enforced
 */
async function requireAuthedSupabase() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Misconfigured server env
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
        // In Route Handlers, cookies can be set on the response,
        // but auth.getUser() typically only needs reads.
        // We still implement setAll for correctness.
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

export async function GET(_req: NextRequest) {
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;

  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("user_email", userEmail)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase GET /api/cases error:", error);
    return NextResponse.json({ error: "Failed to load cases" }, { status: 500 });
  }

  // IMPORTANT: no seeding in production.
  const cases = (data ?? []).map(mapRowToCase);
  return NextResponse.json(cases);
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

  const caseNumber = String(body.caseNumber ?? "").trim();
  const matter = String(body.matter ?? "").trim();
  const parties = String(body.parties ?? "").trim();
  const county = String(body.county ?? "").trim();
  const status: CaseStatus = (body.status as CaseStatus) || "Open";

  const nextSessionDate =
    body.nextSessionDate && String(body.nextSessionDate).trim()
      ? String(body.nextSessionDate)
      : null;

  const notes =
    body.notes && String(body.notes).trim() ? String(body.notes) : null;

  if (!caseNumber || !matter || !parties || !county) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("cases")
    .insert({
      user_email: userEmail,
      case_number: caseNumber,
      matter,
      parties,
      county,
      status,
      next_session_date: nextSessionDate,
      notes,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Supabase POST /api/cases error:", error);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }

  return NextResponse.json(mapRowToCase(data), { status: 201 });
}
