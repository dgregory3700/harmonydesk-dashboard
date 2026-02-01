"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const sp = useSearchParams();

  const token = sp.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!token) return setError("Missing token.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to set password.");

      // Auto-login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: json.email,
        password,
      });

      if (loginError) throw loginError;

      router.replace("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
        <h1 className="text-xl font-semibold text-slate-100">Create your password</h1>
        <p className="mt-2 text-sm text-slate-400">
          This is a one-time setup. After this, you’ll sign in with email + password.
        </p>

        <div className="mt-6 space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Set password & continue"}
          </button>

          {error && (
            <div className="rounded-lg border border-red-900/40 bg-red-900/20 p-3">
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
