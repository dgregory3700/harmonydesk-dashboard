import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type UserSettings = {
  id: string;
  userEmail: string;
  fullName: string | null;
  phone: string | null;
  businessName: string | null;
  businessAddress: string | null;
  defaultHourlyRate: number | null;
  defaultCounty: string | null;
  defaultSessionDuration: number | null;
  timezone: string | null;
  darkMode: boolean;
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

function mapRow(row: any): UserSettings {
  return {
    id: row.id,
    userEmail: row.user_email,
    fullName: row.full_name,
    phone: row.phone,
    businessName: row.business_name,
    businessAddress: row.business_address,
    defaultHourlyRate:
      row.default_hourly_rate !== null ? Number(row.default_hourly_rate) : null,
    defaultCounty: row.default_county,
    defaultSessionDuration:
      row.default_session_duration !== null
        ? Number(row.default_session_duration)
        : null,
    timezone: row.timezone,
    darkMode: !!row.dark_mode,
  };
}

export async function GET(_req: NextRequest) {
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_email", userEmail)
    .maybeSingle();

  if (error) {
    console.error("Supabase GET /api/user-settings error:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({
      id: null,
      userEmail,
      fullName: null,
      phone: null,
      businessName: null,
      businessAddress: null,
      defaultHourlyRate: 200,
      defaultCounty: "King County",
      defaultSessionDuration: 1.0,
      timezone: "America/Los_Angeles",
      darkMode: false,
    });
  }

  return NextResponse.json(mapRow(data));
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuthedSupabase();
  if (!auth.ok) return auth.res;

  const { supabase, userEmail } = auth;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, any> = {};

  if ("fullName" in body)
    update.full_name = body.fullName === "" ? null : body.fullName;
  if ("phone" in body) update.phone = body.phone || null;
  if ("businessName" in body)
    update.business_name = body.businessName || null;
  if ("businessAddress" in body)
    update.business_address = body.businessAddress || null;
  if ("defaultHourlyRate" in body) {
    const r = Number.parseFloat(body.defaultHourlyRate ?? "0");
    update.default_hourly_rate = Number.isNaN(r) ? null : r;
  }
  if ("defaultCounty" in body)
    update.default_county = body.defaultCounty || null;
  if ("defaultSessionDuration" in body) {
    const d = Number.parseFloat(body.defaultSessionDuration ?? "0");
    update.default_session_duration = Number.isNaN(d) ? null : d;
  }
  if ("timezone" in body) update.timezone = body.timezone || null;
  if ("darkMode" in body) update.dark_mode = !!body.darkMode;

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_email: userEmail,
        ...update,
      },
      { onConflict: "user_email" }
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("Supabase PATCH /api/user-settings error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }

  return NextResponse.json(mapRow(data));
}
