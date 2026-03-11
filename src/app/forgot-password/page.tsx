"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : "https://app.harmonydesk.ai/reset-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      setErrorMessage(error.message || "Unable to send reset email.");
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Enter the email address tied to your HarmonyDesk account. We’ll
              send you a secure password reset link.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
                Check your email for a password reset link.
              </div>

              <p className="text-sm text-slate-400">
                If you don’t see it in a few minutes, check spam or promotions.
              </p>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                >
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              {errorMessage ? (
                <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Sending reset link..." : "Send reset link"}
              </button>

              <div className="pt-1">
                <Link
                  href="/login"
                  className="text-sm text-slate-400 underline underline-offset-4 hover:text-slate-200"
                >
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
