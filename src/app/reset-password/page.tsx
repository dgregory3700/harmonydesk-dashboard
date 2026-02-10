"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabaseBrowser.auth.updateUser({ password });
      if (error) throw error;

      router.replace("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
        <h1 className="text-xl font-semibold text-slate-100">Set new password</h1>

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
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save password"}
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
