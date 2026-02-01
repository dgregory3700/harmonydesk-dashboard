"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginClient({
  loadingOverride,
}: {
  loadingOverride?: boolean;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const cooldownActive = cooldownUntil !== null && Date.now() < cooldownUntil;

  const next = searchParams.get("next") ?? "/dashboard";

  // If redirected back with an error param, surface it
  useEffect(() => {
    const e = searchParams.get("error");
    if (e) setError(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Consume magic-link hash tokens on /login and establish a real session before redirecting
  useEffect(() => {
    let cancelled = false;

    async function consumeHashSession() {
      try {
        if (typeof window === "undefined") return;

        const hash = window.location.hash || "";
        const hasTokens =
          hash.includes("access_token=") && hash.includes("refresh_token=");

        if (!hasTokens) return;

        setLoading(true);
        setError(null);

        const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
          throw new Error("Missing access_token or refresh_token in magic link.");
        }

        // 1) Set session
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (setSessionError) throw setSessionError;

        // 2) Confirm user exists (this is the key)
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!data?.user) throw new Error("No user after setting session.");

        // 3) Clear hash (security + prevents repeat processing)
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        );

        // 4) Now redirect
        if (!cancelled) router.replace(next);
      } catch (err: any) {
        console.error("Magic link consume failed:", err);
        if (!cancelled) setError(err?.message ?? "Failed to complete sign-in.");
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

      if (typeof window === "undefined") {
        throw new Error("Browser environment not available.");
      }

      // ✅ Make /login the redirect target (since your links already land on /login)
      const redirectTo = `${window.location.origin}/login?next=${encodeURIComponent(
        next
      )}`;

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
          <h1 className="text-2xl font-semibold text-slate-100">
            Sign in to HarmonyDesk
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            We’ll email you a secure magic link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-300"
            >
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
              Magic link sent to{" "}
              <span className="font-medium">{email.trim()}</span>. Open your
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
