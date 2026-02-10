"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      });

      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
        <h1 className="text-xl font-semibold text-slate-100">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-400">We’ll email you a reset link.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <button
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        {sent && (
          <p className="mt-3 text-xs text-emerald-300">
            Reset link sent. Check your inbox.
          </p>
        )}
        {error && (
          <p className="mt-3 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs text-slate-400 hover:text-slate-200">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
