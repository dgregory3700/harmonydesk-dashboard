import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { requireUserEmail } from "@/lib/api/requireUserEmail";

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
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUserEmail(req);
    if (!auth.ok) return auth.response;
    const userEmail = auth.email;
    
    const { id } = await context.params;

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
    const auth = await requireUserEmail(req);
    if (!auth.ok) return auth.response;
    const userEmail = auth.email;
    
    const { id } = await context.params;
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
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUserEmail(req);
    if (!auth.ok) return auth.response;
    const userEmail = auth.email;
    
    const { id } = await context.params;

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
