// src/app/api/cases/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CaseStatus = "Active" | "Closed";

export type MediationCase = {
  id: string;
  caseNumber: string;
  matter: string;
  parties: string;
  county: string;
  status: CaseStatus;
  nextSessionDate: string | null;
  notes: string | null;
  archivedAt: string | null;
};

function normalizeCaseStatus(raw: unknown): CaseStatus {
  const v = String(raw ?? "").trim();

  // Closed stays closed.
  if (v === "Closed") return "Closed";

  // New truth + legacy values all map to Active.
  // ("Active", "Open", "Upcoming", null/empty, etc.)
  return "Active";
}

function mapRowToCase(row: any): MediationCase {
  return {
    id: row.id,
    caseNumber: row.case_number,
    matter: row.matter,
    parties: row.parties,
    county: row.county,
    status: normalizeCaseStatus(row.status),
    // NOTE: This DB field is legacy metadata. We override in GET with sessions-derived truth.
    nextSessionDate: row.next_session_date ?? null,
    notes: row.notes ?? null,
    archivedAt: row.archived_at ?? null,
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

export async function GET(_req: NextRequest) {
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;

  // 1) Load cases (user-scoped) — default view excludes archived
  const { data: caseRows, error: casesError } = await supabase
    .from("cases")
    .select("*")
    .eq("user_email", userEmail)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (casesError) {
    console.error("Supabase GET /api/cases error:", casesError);
    return NextResponse.json({ error: "Failed to load cases" }, { status: 500 });
  }

  // 2) Load upcoming, non-completed sessions (user-scoped) and compute earliest per case_id
  //    Truth rule: next session comes from sessions table, not cases.next_session_date metadata.
  const nowIso = new Date().toISOString();

  const { data: sessionRows, error: sessionsError } = await supabase
    .from("sessions")
    .select("case_id,date,completed")
    .eq("user_email", userEmail)
    .eq("completed", false)
    .gt("date", nowIso)
    .order("date", { ascending: true });

  // Fail-soft: if sessions lookup fails, we degrade nextSessionDate to null.
  const nextByCaseId: Record<string, string> = {};
  if (sessionsError) {
    console.error(
      "Supabase GET /api/cases (sessions lookup) error:",
      sessionsError
    );
  } else {
    for (const s of sessionRows ?? []) {
      const caseId = String((s as any).case_id ?? "").trim();
      const date = (s as any).date as string | undefined;

      if (!caseId || !date) continue;

      // Rows are ordered ascending by date, so first per case is earliest upcoming.
      if (!nextByCaseId[caseId]) {
        nextByCaseId[caseId] = date;
      }
    }
  }

  // 3) Return cases with nextSessionDate overridden by sessions-derived value
  const cases = (caseRows ?? []).map((row) => {
    const c = mapRowToCase(row);

    // Product truth: Closed cases should not show an upcoming next session in the list,
    // even if future sessions exist.
    const isClosed = c.status === "Closed";

    return {
      ...c,
      nextSessionDate: isClosed ? null : nextByCaseId[c.id] ?? null,
    };
  });

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

  const status: CaseStatus = normalizeCaseStatus(body.status);

  // Legacy metadata; kept for compatibility, but NOT used for /cases truth display.
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
      archived_at: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Supabase POST /api/cases error:", error);
    return NextResponse.json(
      { error: "Failed to create case" },
      { status: 500 }
    );
  }

  return NextResponse.json(mapRowToCase(data), { status: 201 });
}
