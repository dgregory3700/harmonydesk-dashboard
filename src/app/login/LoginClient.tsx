"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginClient({ loadingOverride }: { loadingOverride?: boolean }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const urlError = searchParams.get("error");
  const urlMessage = searchParams.get("message");

  const [error, setError] = useState<string | null>(
    urlError ? `${urlError}${urlMessage ? ` — ${urlMessage}` : ""}` : null
  );

  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const cooldownActive = cooldownUntil !== null && Date.now() < cooldownUntil;

  const next = searchParams.get("next") ?? "/dashboard";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || cooldownActive) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      setLoading(true);
      setError(null);
      setSent(false);

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: redirectTo },
      });

      if (otpError) throw otpError;

      setSent(true);
      setCooldownUntil(Date.now() + 60_000);
    } catch (err: any) {
      console.error("Magic link send error:", err);
      setError(err?.message ?? "Failed to send magic link.");
    } finally {
      setLoading(false);
    }
  }

  const effectiveLoading = loadingOverride ? true : loading;

  const buttonLabel = effectiveLoading
    ? "Working…"
    : cooldownActive
    ? "Please wait…"
    : "Send magic link";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-lg backdrop-blur-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-100">Sign in to HarmonyDesk</h1>
          <p className="mt-2 text-sm text-slate-400">We’ll email you a secure magic link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={effectiveLoading || cooldownActive}
            className="mt-2 w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
          >
            {buttonLabel}
          </button>
        </form>

        {sent && !error && (
          <div className="mt-4 rounded-lg border border-emerald-900/40 bg-emerald-900/20 p-3">
            <p className="text-xs text-emerald-300">
              Magic link sent to <span className="font-medium">{email.trim()}</span>. Open your email
              and click the link to finish signing in.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-900/40 bg-red-900/20 p-3">
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <p className="mt-4 text-[11px] text-center text-slate-500">
          If you don’t see the email, check spam or wait a minute.
        </p>

        <div className="mt-6 text-center">
          <Link
            href="https://harmonydesk.ai"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
