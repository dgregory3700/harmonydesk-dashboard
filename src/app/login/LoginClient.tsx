"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginClient({ loadingOverride }: { loadingOverride?: boolean }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") ?? "/dashboard";

  const urlError = searchParams.get("error");
  const urlMessage = searchParams.get("message");
  const urlEmail = searchParams.get("email");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const [error, setError] = useState<string | null>(
    urlError ? `${urlError}` : null
  );

  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (urlEmail && typeof urlEmail === "string") {
      setEmail(urlEmail.trim().toLowerCase());
    }

    if (urlMessage === "password_set") {
      setNotice("Password set successfully. Please sign in to continue.");
    } else if (urlMessage) {
      setNotice(urlMessage);
    }
  }, [urlEmail, urlMessage]);

  const effectiveLoading = loadingOverride ? true : loading;

  async function handlePasswordLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (effectiveLoading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return;

    try {
      setLoading(true);
      setError(null);
      setNotice(null);

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) throw loginError;

      router.replace(next);
    } catch (err: any) {
      console.error("Password login error:", err);
      setError(err?.message ?? "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (effectiveLoading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      setLoading(true);
      setError(null);
      setNotice(null);
      setSent(false);

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: redirectTo },
      });

      if (otpError) throw otpError;

      setSent(true);
    } catch (err: any) {
      console.error("Magic link send error:", err);
      setError(err?.message ?? "Failed to send magic link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-lg backdrop-blur-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-100">
            Sign in to HarmonyDesk
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Use your email and password to access your dashboard.
          </p>
        </div>

        {notice && !error && (
          <div className="mb-4 rounded-lg border border-emerald-900/40 bg-emerald-900/20 p-3">
            <p className="text-xs text-emerald-300">{notice}</p>
          </div>
        )}

        {/* Password login */}
        <form onSubmit={handlePasswordLogin} className="space-y-3">
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Your password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={effectiveLoading}
            className="mt-2 w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
          >
            {effectiveLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs">
          <Link
            href="/forgot-password"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            Forgot password?
          </Link>

          <span className="text-slate-500">
            New customer?{" "}
            <span className="text-slate-400">
              Complete setup after purchase.
            </span>
          </span>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <div className="text-[11px] text-slate-500">Optional</div>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <form onSubmit={handleMagicLink}>
          <button
            type="submit"
            disabled={effectiveLoading}
            className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60"
          >
            {effectiveLoading ? "Working…" : "Send magic link instead"}
          </button>
        </form>

        {sent && !error && (
          <div className="mt-4 rounded-lg border border-emerald-900/40 bg-emerald-900/20 p-3">
            <p className="text-xs text-emerald-300">
              Magic link sent to <span className="font-medium">{email.trim()}</span>.
              Check your email.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-900/40 bg-red-900/20 p-3">
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

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
