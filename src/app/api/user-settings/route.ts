import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseServer";

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

// NOTE: cookies() is async in recent Next.js
async function getUserEmail() {
  const cookieStore = await cookies();

  const all = cookieStore.getAll();
  console.log("cookies seen in /api/user-settings:", all);

  const candidate =
    cookieStore.get("hd_user_email") ||
    cookieStore.get("hd-user-email") ||
    cookieStore.get("user_email") ||
    cookieStore.get("userEmail") ||
    cookieStore.get("email");

  if (candidate?.value) {
    return candidate.value;
  }

  return "dev-mediator@harmonydesk.local";
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
  try {
    const userEmail = await getUserEmail();

    const { data, error } = await supabaseAdmin
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
      // no row yet -> return sensible defaults
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
  } catch (err) {
    console.error("Unexpected GET /api/user-settings error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userEmail = await getUserEmail();
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
    if ("defaultCounty" in body)
      update.default_county = body.defaultCounty || null;
    if ("defaultSessionDuration" in body) {
      const d = Number.parseFloat(body.defaultSessionDuration ?? "0");
      update.default_session_duration = Number.isNaN(d) ? null : d;
    }
    if ("timezone" in body) update.timezone = body.timezone || null;
    if ("darkMode" in body) update.dark_mode = !!body.darkMode;

    // upsert: insert if missing, otherwise update
    const { data, error } = await supabaseAdmin
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
