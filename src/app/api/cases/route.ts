import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseServer";

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

// NOTE: cookies() is async in recent Next.js
async function getUserEmail() {
  const cookieStore = await cookies();

  // Debug: log everything we see
  const all = cookieStore.getAll();
  console.log("cookies seen in /api/cases:", all);

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

// Initial sample cases (used for first-time seeding per user)
const seedCases: Omit<MediationCase, "id">[] = [
  {
    caseNumber: "HD-2025-001",
    matter: "Smith vs. Turner – parenting plan",
    parties: "Alex Smith / Jamie Turner",
    county: "King County",
    status: "Upcoming",
    nextSessionDate: "2025-12-05",
    notes: "Parenting plan revision; high conflict, needs extra buffer time.",
  },
  {
    caseNumber: "HD-2025-002",
    matter: "Johnson vs. Lee – small claims",
    parties: "Taylor Johnson / Morgan Lee",
    county: "Pierce County",
    status: "Open",
    nextSessionDate: "2025-12-10",
    notes: "Dispute over contractor invoice; discovery in progress.",
  },
  {
    caseNumber: "HD-2025-003",
    matter: "Miller vs. Rivera – neighbor dispute",
    parties: "Chris Miller / Ana Rivera",
    county: "King County",
    status: "Closed",
    nextSessionDate: null,
    notes: "Settled; follow-up email sent with agreement PDF.",
  },
];

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

export async function GET(_req: NextRequest) {
  try {
    const userEmail = await getUserEmail();

    let { data, error } = await supabaseAdmin
      .from("cases")
      .select("*")
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase GET /api/cases error:", error);
      return NextResponse.json(
        { error: "Failed to load cases" },
        { status: 500 }
      );
    }

    // Seed sample cases if this user has none yet
    if (!data || data.length === 0) {
      const toInsert = seedCases.map((c) => ({
        user_email: userEmail,
        case_number: c.caseNumber,
        matter: c.matter,
        parties: c.parties,
        county: c.county,
        status: c.status,
        next_session_date: c.nextSessionDate,
        notes: c.notes,
      }));

      const { data: seeded, error: seedError } = await supabaseAdmin
        .from("cases")
        .insert(toInsert)
        .select("*");

      if (seedError) {
        console.error("Supabase cases seed error:", seedError);
        return NextResponse.json(
          { error: "Failed to seed cases" },
          { status: 500 }
        );
      }

      data = seeded ?? [];
    }

    const cases = (data ?? []).map(mapRowToCase);
    return NextResponse.json(cases);
  } catch (err) {
    console.error("Unexpected GET /api/cases error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userEmail = await getUserEmail();
    const body = await req.json();

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
      body.notes && String(body.notes).trim()
        ? String(body.notes)
        : null;

    if (!caseNumber || !matter || !parties || !county) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
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
      return NextResponse.json(
        { error: "Failed to create case" },
        { status: 500 }
      );
    }

    const mediationCase = mapRowToCase(data);
    return NextResponse.json(mediationCase, { status: 201 });
  } catch (err) {
    console.error("Unexpected POST /api/cases error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
