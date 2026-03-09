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

    // Token format: "<raw>.<sig>" where sig = sha256(raw + secret)
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
    const token_hash = sha256(token);

    // 1) Validate token record
    const { data: rec, error: recError } = await supabaseAdmin
      .from("password_setup_tokens")
      .select("id, email, expires_at, used_at")
      .eq("token_hash", token_hash)
      .maybeSingle();

    if (recError) {
      console.error("Token lookup failed:", recError);
      return NextResponse.json({ error: "Token lookup failed." }, { status: 500 });
    }

    if (!rec) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }

    if (rec.used_at) {
      return NextResponse.json({ error: "Token already used." }, { status: 400 });
    }

    const exp = rec.expires_at ? new Date(rec.expires_at).getTime() : 0;
    if (!exp || Number.isNaN(exp) || Date.now() > exp) {
      const { error: expireMarkErr } = await supabaseAdmin
        .from("password_setup_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token_hash", token_hash)
        .is("used_at", null);

      if (expireMarkErr) {
        console.warn("Failed to mark expired token used:", expireMarkErr);
      }

      return NextResponse.json(
        { error: "Token expired. Please restart setup after purchase." },
        { status: 400 }
      );
    }

    const email = (rec.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    // 2) Enforce active subscription
    const { data: sub, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_email", email)
      .maybeSingle();

    if (subError) {
      console.error("Subscription lookup failed:", subError);
      return NextResponse.json({ error: "Subscription lookup failed." }, { status: 500 });
    }

    if (!sub || !["active", "trialing"].includes(sub.status)) {
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
        return NextResponse.json(
          { error: updError.message ?? "Failed to set password." },
          { status: 500 }
        );
      }
    } else {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        console.error("Create user failed:", createError);
        return NextResponse.json(
          { error: createError.message ?? "Failed to create user." },
          { status: 500 }
        );
      }
    }

    // 4) Mark token used with conditional update
    // This is stronger than the old unconditional update because it refuses to
    // "reuse" a token that was consumed by another concurrent request.
    const usedAt = new Date().toISOString();

    const { data: usedRows, error: usedErr } = await supabaseAdmin
      .from("password_setup_tokens")
      .update({ used_at: usedAt })
      .eq("token_hash", token_hash)
      .is("used_at", null)
      .select("id");

    if (usedErr) {
      console.warn("Failed to mark token used:", usedErr);
      return NextResponse.json(
        {
          error:
            "Password was set, but token finalization failed. Do not retry blindly; inspect logs.",
        },
        { status: 500 }
      );
    }

    if (!usedRows || usedRows.length !== 1) {
      console.warn("Token was already consumed during finalization:", { email, token_hash });
      return NextResponse.json(
        {
          error:
            "This setup link was already used during a concurrent request. Try logging in.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, email }, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/set-password error:", e);
    return NextResponse.json({ error: e?.message ?? "Server error." }, { status: 500 });
  }
}
