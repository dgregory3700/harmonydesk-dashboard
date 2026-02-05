import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { requireUserEmail } from "@/lib/api/requireUserEmail";

export type Client = {
  id: string;
  userEmail: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};



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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUserEmail(req);
    if (!auth.ok) return auth.response;
    const userEmail = auth.email;
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").toLowerCase().trim();

    let query = supabaseAdmin
      .from("clients")
      .select("*")
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase GET /api/clients error:", error);
      return NextResponse.json(
        { error: "Failed to load clients" },
        { status: 500 }
      );
    }

    let clients = (data ?? []).map(mapRowToClient);

    if (search) {
      clients = clients.filter((c) => {
        const haystack = (
          c.name +
          " " +
          (c.email ?? "") +
          " " +
          (c.phone ?? "")
        ).toLowerCase();
        return haystack.includes(search);
      });
    }

    return NextResponse.json(clients);
  } catch (err) {
    console.error("Unexpected GET /api/clients error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUserEmail(req);
    if (!auth.ok) return auth.response;
    const userEmail = auth.email;
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const email =
      body.email && String(body.email).trim()
        ? String(body.email).trim()
        : null;
    const phone =
      body.phone && String(body.phone).trim()
        ? String(body.phone).trim()
        : null;
    const notes =
      body.notes && String(body.notes).trim()
        ? String(body.notes).trim()
        : null;

    if (!name) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("clients")
      .insert({
        user_email: userEmail,
        name,
        email,
        phone,
        notes,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase POST /api/clients error:", error);
      return NextResponse.json(
        { error: "Failed to create client" },
        { status: 500 }
      );
    }

    const client = mapRowToClient(data);
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    console.error("Unexpected POST /api/clients error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
