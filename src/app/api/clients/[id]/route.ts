import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseServer";

type Client = {
  id: string;
  userEmail: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

// NOTE: cookies() is async in recent Next.js
async function getUserEmail() {
  const cookieStore = await cookies();

  // Debug: log everything we see
  const all = cookieStore.getAll();
  console.log("cookies seen in /api/clients/[id]:", all);

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

function mapRowToClient(row: any): Client {
  return {
    id: row.id,
    userEmail: row.user_email,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
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

    console.log("GET /api/clients/[id]", { id, userEmail });

    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("user_email", userEmail)
      .single();

    if (error || !data) {
      console.error("Supabase GET client error:", error);
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const client = mapRowToClient(data);
    return NextResponse.json(client);
  } catch (err) {
    console.error("Unexpected GET /api/clients/[id] error:", err);
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

    if (body.name !== undefined) {
      const val = String(body.name).trim();
      if (!val) {
        return NextResponse.json(
          { error: "Client name cannot be empty" },
          { status: 400 }
        );
      }
      update.name = val;
    }

    if (body.email !== undefined) {
      const val = String(body.email).trim();
      update.email = val || null;
    }

    if (body.phone !== undefined) {
      const val = String(body.phone).trim();
      update.phone = val || null;
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

    console.log("PATCH /api/clients/[id]", { id, userEmail, update });

    const { data, error } = await supabaseAdmin
      .from("clients")
      .update(update)
      .eq("id", id)
      .eq("user_email", userEmail)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase PATCH client error:", error);
      return NextResponse.json(
        { error: "Failed to update client" },
        { status: 500 }
      );
    }

    const client = mapRowToClient(data);
    return NextResponse.json(client);
  } catch (err) {
    console.error("Unexpected PATCH /api/clients/[id] error:", err);
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

    console.log("DELETE /api/clients/[id]", { id, userEmail });

    const { error } = await supabaseAdmin
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("user_email", userEmail);

    if (error) {
      console.error("Supabase DELETE client error:", error);
      return NextResponse.json(
        { error: "Failed to delete client" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Unexpected DELETE /api/clients/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
