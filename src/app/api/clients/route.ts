import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type Client = {
  id: string;
  userEmail: string;
  name: string;
  email: string | null;
  phone: string | null;
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
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").toLowerCase().trim();

  let query = supabase
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

  const { data, error } = await supabase
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
}
