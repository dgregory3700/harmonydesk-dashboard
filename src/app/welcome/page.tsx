// src/app/welcome/page.tsx

import { redirect } from "next/navigation";
import crypto from "crypto";
import {
  fetchStripeCheckoutSession,
  findLatestCheckoutSessionIdByEmail,
} from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export const dynamic = "force-dynamic";

function isPaid(session: { payment_status?: string; status?: string }) {
  return session.payment_status === "paid" || session.status === "complete";
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: { session_id?: string; email?: string; error?: string };
}) {
  const sessionId = searchParams.session_id?.trim();
  const emailParam = searchParams.email?.trim().toLowerCase();

  // If Stripe didn't pass session_id, we recover via email → latest paid session lookup.
  if (!sessionId) {
    // If user already submitted email, attempt server-side recovery.
    if (emailParam) {
      const recoveredId = await findLatestCheckoutSessionIdByEmail(emailParam);
      if (!recoveredId) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
              <h1 className="text-xl font-semibold text-slate-100">Complete setup</h1>
              <p className="mt-2 text-sm text-slate-400">
                We couldn’t find a recent paid checkout for that email. Double-check the email used at checkout.
              </p>

              <form className="mt-6 space-y-3" method="GET" action="/welcome">
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={emailParam}
                  placeholder="Email used at checkout"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  Try again
                </button>
              </form>

              <div className="mt-6 text-xs text-slate-500">
                If this keeps happening, the most common cause is the redirect URL being encoded so Stripe can’t substitute
                {" "}{"{CHECKOUT_SESSION_ID}"}.
              </div>
            </div>
          </div>
        );
      }

      redirect(`/welcome?session_id=${encodeURIComponent(recoveredId)}`);
    }

    // First visit without session_id: show email recovery form instead of dumping them back to /login.
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
          <h1 className="text-xl font-semibold text-slate-100">Complete setup</h1>
          <p className="mt-2 text-sm text-slate-400">
            If you just paid and weren’t redirected correctly, enter the email you used at checkout.
          </p>

          <form className="mt-6 space-y-3" method="GET" action="/welcome">
            <input
              name="email"
              type="email"
              required
              placeholder="Email used at checkout"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Continue
            </button>
          </form>

          <div className="mt-6 text-xs text-slate-500">
            Tip: Stripe expects the redirect URL placeholder to be a literal string {"{CHECKOUT_SESSION_ID}"} and replaces it automatically. :contentReference[oaicite:4]{index=4}
          </div>
        </div>
      </div>
    );
  }

  // 1) Verify Stripe payment from the session_id
  const session = await fetchStripeCheckoutSession(sessionId);

  const paid = isPaid(session);
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
  if (!sub || !["active", "trialing"].includes(sub.status)) {
  redirect("/login?error=subscription_inactive");
}

  // 3) Mint password setup token (one-time)
  const secret = process.env.APP_TOKEN_SECRET;
  if (!secret) redirect("/login?error=missing_app_secret");

  const raw = crypto.randomBytes(32).toString("hex");
  const token = `${raw}.${sha256(raw + secret)}`;
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
