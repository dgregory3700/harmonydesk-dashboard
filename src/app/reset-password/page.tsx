"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeRecoverySession() {
      setErrorMessage(null);

      const search = new URLSearchParams(window.location.search);
      const hash = window.location.hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(hash);

      // Preferred SSR-safe path: token_hash from customized email template
      const tokenHash =
        search.get("token_hash") || hashParams.get("token_hash");
      const flowType = search.get("type") || hashParams.get("type");

      if (tokenHash && flowType === "recovery") {
        const { error } = await supabaseBrowser.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

        if (!isMounted) return;

        if (error) {
          setErrorMessage(
            error.message || "This password reset link is invalid or expired."
          );
          setReady(true);
          return;
        }

        setReady(true);
        return;
      }

      // Legacy fallback: access/refresh token flow
      const accessToken =
        search.get("access_token") || hashParams.get("access_token");
      const refreshToken =
        search.get("refresh_token") || hashParams.get("refresh_token");
      const legacyType = search.get("type") || hashParams.get("type");

      if (accessToken && refreshToken && legacyType === "recovery") {
        const { error } = await supabaseBrowser.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!isMounted) return;

        if (error) {
          setErrorMessage(
            error.message || "This password reset link is invalid or expired."
          );
          setReady(true);
          return;
        }

        setReady(true);
        return;
      }

      if (isMounted) {
        setErrorMessage(
          "This password reset link is invalid or expired. Please request a new one."
        );
        setReady(true);
      }
    }

    initializeRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabaseBrowser.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMessage(error.message || "Unable to update password.");
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);

    setTimeout(() => {
      router.replace("/login?message=password_set");
    }, 1800);
  }

  const showInvalidLinkState =
    ready && !success && !!errorMessage && !password && !confirmPassword;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              Choose a new password
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Set a new password for your HarmonyDesk account.
            </p>
          </div>

          {!ready ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              Validating your reset link...
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
                Password updated successfully. Redirecting to login...
              </div>

              <Link
                href="/login?message=password_set"
                className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Go to login now
              </Link>
            </div>
          ) : showInvalidLinkState ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">
                {errorMessage}
              </div>

              <Link
                href="/forgot-password"
                className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
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
                {submitting ? "Updating password..." : "Update password"}
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
