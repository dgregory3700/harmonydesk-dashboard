"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginClient({ loadingOverride }: { loadingOverride?: boolean }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Cooldown to reduce rate limiting
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const cooldownActive = cooldownUntil !== null && Date.now() < cooldownUntil;

  const next = searchParams.get("next") ?? "/dashboard";

  // Consume magic-link tokens from URL hash and set session on the client
  useEffect(() => {
    let cancelled = false;

    async function consumeHashSession() {
      try {
        const hash = window.location.hash;

        if (!hash || !hash.includes("access_token=") || !hash.includes("refresh_token=")) {
          return;
        }

        setLoading(true);
        setError(null);

        const params = new URLSearchParams(hash.replace(/^#/, ""));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) return;

        const { error: setSessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (setSessionError) throw setSessionError;

        // Clear hash from URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        );

        if (!cancelled) router.replace(next);
      } catch (err: any) {
        console.error("Failed to consume magic link session from hash:", err);
        if (!cancelled) setError(err?.message ?? "Failed to complete sign-in from magic link.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    consumeHashSession();
    return () => {
      cancelled = true;
    };
  }, [supabase, router, next]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || cooldownActive) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      setLoading(true);
      setError(null);
      setSent(false);

      // Use /login as the redirect target since your email link is arriving with #access_token
      const redirectTo = `${window.location.origin}/login?next=${encodeURIComponent(next)}`;

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (otpError) throw otpError;

      setSent(true);
      setCooldownUntil(Date.now() + 60_000);
    } catch (err: any) {
      console.error("Magic link error:", err);
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
          <h1 className="text-2xl font-semibold text-slate-100">
            Sign in to HarmonyDesk
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            We’ll email you a secure magic link.
          </p>
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
              Magic link sent to <span className="font-medium">{email.trim()}</span>. Open your
              email and click the link to finish signing in.
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
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
