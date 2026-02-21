import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";

type UserSettings = {
  id: string | null;
  userEmail: string;
  fullName: string | null;
  phone: string | null;
  businessName: string | null;
  businessAddress: string | null;
  defaultHourlyRate: number | null;

  // legacy (string)
  defaultCounty: string | null;

  // new (uuid)
  defaultCountyId: string | null;

  defaultSessionDuration: number | null;
  timezone: string | null;
  darkMode: boolean;
};

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
    defaultCounty: row.default_county ?? null,
    defaultCountyId: row.default_county_id ?? null,
    defaultSessionDuration:
      row.default_session_duration !== null
        ? Number(row.default_session_duration)
        : null,
    timezone: row.timezone,
    darkMode: !!row.dark_mode,
  };
}

function defaultSettings(userEmail: string): UserSettings {
  return {
    id: null,
    userEmail,
    fullName: null,
    phone: null,
    businessName: null,
    businessAddress: null,
    defaultHourlyRate: 200,
    defaultCounty: "King County", // legacy default
    defaultCountyId: null, // new deterministic default is chosen by user in Settings
    defaultSessionDuration: 1.0,
    timezone: "America/Los_Angeles",
    darkMode: false,
  };
}

export async function GET(_req: NextRequest) {
  try {
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
      return NextResponse.json(defaultSettings(userEmail));
    }

    return NextResponse.json(mapRow(data));
  } catch (err) {
    console.error("Unexpected GET /api/user-settings error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;
    const body = await req.json();

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

    // legacy string (keep, but no longer used for exports)
    if ("defaultCounty" in body)
      update.default_county = body.defaultCounty || null;

    // new uuid default
    if ("defaultCountyId" in body) {
      update.default_county_id =
        typeof body.defaultCountyId === "string" && body.defaultCountyId.trim()
          ? body.defaultCountyId.trim()
          : null;
    }

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
  } catch (err) {
    console.error("Unexpected PATCH /api/user-settings error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
