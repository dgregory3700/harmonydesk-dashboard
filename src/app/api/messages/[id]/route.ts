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
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;
  const { id } = await context.params;

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("id", id)
    .eq("user_email", userEmail)
    .single();

  if (error || !data) {
    console.error("Supabase GET message error:", error);
    return NextResponse.json(
      { error: "Message not found" },
      { status: 404 }
    );
  }

  const message = mapRowToMessage(data);
  return NextResponse.json(message);
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
    .from("messages")
    .delete()
    .eq("id", id)
    .eq("user_email", userEmail);

  if (error) {
    console.error("Supabase DELETE message error:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
