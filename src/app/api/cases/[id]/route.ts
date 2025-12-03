import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseServer";

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

// NOTE: cookies() is async in recent Next.js
async function getUserEmail() {
  const cookieStore = await cookies();

  // Debug: log everything we see
  const all = cookieStore.getAll();
  console.log("cookies seen in /api/cases/[id]:", all);

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
  try {
    const { id } = await context.params;
    const userEmail = await getUserEmail();

    console.log("GET /api/cases/[id]", { id, userEmail });

    const { data, error } = await supabaseAdmin
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
  } catch (err) {
    console.error("Unexpected GET /api/cases/[id] error:", err);
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

    console.log("PATCH /api/cases/[id]", { id, userEmail, update });

    const { data, error } = await supabaseAdmin
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
  } catch (err) {
    console.error("Unexpected PATCH /api/cases/[id] error:", err);
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

    console.log("DELETE /api/cases/[id]", { id, userEmail });

    const { error } = await supabaseAdmin
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
  } catch (err) {
    console.error("Unexpected DELETE /api/cases/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
