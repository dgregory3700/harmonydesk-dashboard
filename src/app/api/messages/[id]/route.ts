import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";

type Message = {
  id: string;
  userEmail: string;
  caseId: string | null;
  subject: string;
  body: string;
  createdAt: string;
};

function mapRowToMessage(row: any): Message {
  return {
    id: row.id,
    userEmail: row.user_email,
    caseId: row.case_id ?? null,
    subject: row.subject,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;
    const { id } = await context.params;

    const { data, error } = await supabase
      .
