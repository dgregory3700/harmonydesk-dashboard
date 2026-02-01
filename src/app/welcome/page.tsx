import { redirect } from "next/navigation";
import { fetchStripeCheckoutSession } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export const dynamic = "force-dynamic";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  if (!sessionId) redirect("/login?error=missing_session_id");

  // 1) Verify Stripe payment
  const session = await fetchStripeCheckoutSession(sessionId);

  const paid =
    session.payment_status === "paid" ||
    session.status === "complete";

  const email = session.customer_details?.email?.trim().toLowerCase();

  if (!paid || !email) {
    redirect("/login?error=payment_not_verified");
  }

  // 2) Verify subscription is active in Supabase (your existing sync)
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: sub, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .select("status,user_email")
    .eq("user_email", email)
    .maybeSingle();

  if (subError) redirect("/login?error=sub_lookup_failed");
  if (!sub || sub.status !== "active") redirect("/login?error=subscription_inactive");

  // 3) Mint password setup token (one-time)
  const secret = process.env.APP_TOKEN_SECRET;
  if (!secret) redirect("/login?error=missing_app_secret");

  const raw = crypto.randomBytes(32).toString("hex");
  const token = `${raw}.${sha256(raw + secret)}`; // prevents simple token guessing
  const token_hash = sha256(token);

  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  const { error: insertError } = await supabaseAdmin
    .from("password_setup_tokens")
    .insert({
      email,
      token_hash,
      expires_at: expires,
    });

  if (insertError) redirect("/login?error=token_insert_failed");

  redirect(`/set-password?token=${encodeURIComponent(token)}`);
}
