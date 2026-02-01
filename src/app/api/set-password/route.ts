import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdminClient, findUserIdByEmail } from "@/lib/supabase/admin";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // 1) Validate token record
    const token_hash = sha256(token);

    const { data: rec, error: recError } = await supabaseAdmin
      .from("password_setup_tokens")
      .select("email, expires_at, used_at")
      .eq("token_hash", token_hash)
      .maybeSingle();

    if (recError) return NextResponse.json({ error: "Token lookup failed." }, { status: 400 });
    if (!rec) return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    if (rec.used_at) return NextResponse.json({ error: "Token already used." }, { status: 400 });

    const exp = new Date(rec.expires_at).getTime();
    if (Date.now() > exp) return NextResponse.json({ error: "Token expired." }, { status: 400 });

    const email = (rec.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Invalid email." }, { status: 400 });

    // 2) Enforce active subscription
    const { data: sub, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_email", email)
      .maybeSingle();

    if (subError) return NextResponse.json({ error: "Subscription lookup failed." }, { status: 400 });
    if (!sub || sub.status !== "active") {
      return NextResponse.json({ error: "Subscription inactive." }, { status: 403 });
    }

    // 3) Create or update auth user password
    const existingId = await findUserIdByEmail(email);

    if (existingId) {
      const { error: updError } = await supabaseAdmin.auth.admin.updateUserById(existingId, {
        password,
      });
      if (updError) return NextResponse.json({ error: updError.message }, { status: 400 });
    } else {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // 4) Mark token used
    await supabaseAdmin
      .from("password_setup_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token_hash", token_hash);

    return NextResponse.json({ ok: true, email });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error." }, { status: 500 });
  }
}
