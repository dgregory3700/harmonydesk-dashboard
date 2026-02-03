// src/app/api/set-password/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdminClient, findUserIdByEmail } from "@/lib/supabase/admin";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const secret = process.env.APP_TOKEN_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Missing APP_TOKEN_SECRET." }, { status: 500 });
    }

    // Validate token signature: token = "<raw>.<sig>", sig = sha256(raw + secret)
    const parts = token.split(".");
    if (parts.length !== 2) {
      return NextResponse.json({ error: "Invalid token format." }, { status: 400 });
    }

    const [raw, sig] = parts;
    const expectedSig = sha256(raw + secret);

    if (sig !== expectedSig) {
      return NextResponse.json({ error: "Invalid token signature." }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // 1) Validate token record (exists, not used, not expired)
    const token_hash = sha256(token);

    const { data: rec, error: recError } = await supabaseAdmin
      .from("password_setup_tokens")
      .select("email, expires_at, used_at")
      .eq("token_hash", token_hash)
      .maybeSingle();

    if (recError) {
      console.error("Token lookup failed:", recError);
      return NextResponse.json({ error: "Token lookup failed." }, { status: 500 });
    }

    if (!rec) return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    if (rec.used_at) return NextResponse.json({ error: "Token already used." }, { status: 400 });

    const exp = rec.expires_at ? new Date(rec.expires_at).getTime() : 0;
    if (!exp || Number.isNaN(exp) || Date.now() > exp) {
      // Consume expired tokens to reduce repeated retries
      await supabaseAdmin
        .from("password_setup_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token_hash", token_hash);

      return NextResponse.json(
        { error: "Token expired. Please restart setup after purchase." },
        { status: 400 }
      );
    }

    const email = (rec.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Invalid email." }, { status: 400 });

    // 2) Enforce active subscription (your existing rule)
    const { data: sub, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_email", email)
      .maybeSingle();

    if (subError) {
      console.error("Subscription lookup failed:", subError);
      return NextResponse.json({ error: "Subscription lookup failed." }, { status: 500 });
    }

    if (!sub || sub.status !== "active") {
      return NextResponse.json({ error: "Subscription inactive." }, { status: 403 });
    }

    // 3) Create or update auth user password
    const existingId = await findUserIdByEmail(email);

    if (existingId) {
      const { error: updError } = await supabaseAdmin.auth.admin.updateUserById(existingId, {
        password,
        email_confirm: true,
      });
      if (updError) {
        console.error("Update user failed:", updError);
        return NextResponse.json({ error: updError.message ?? "Failed to set password." }, { status: 500 });
      }
    } else {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) {
        console.error("Create user failed:", createError);
        return NextResponse.json({ error: createError.message ?? "Failed to create user." }, { status: 500 });
      }
    }

    // 4) Consume token (prefer delete; if your schema requires used_at, we can keep update instead)
    // If you want to preserve audit trails, replace delete() with update({ used_at: ... }).
    const { error: delErr } = await supabaseAdmin
      .from("password_setup_tokens")
      .delete()
      .eq("token_hash", token_hash);

    if (delErr) {
      // Not fatal for user login; but we want it visible in logs.
      console.warn("Failed to delete password_setup_tokens row:", delErr);

      // Fallback to used_at to prevent reuse even if delete fails.
      await supabaseAdmin
        .from("password_setup_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token_hash", token_hash);
    }

    return NextResponse.json({ ok: true, email }, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/set-password error:", e);
    return NextResponse.json({ error: e?.message ?? "Server error." }, { status: 500 });
  }
}
