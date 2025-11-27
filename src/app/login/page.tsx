"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent } from "react";
import { auth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "").trim();

    // For now, any email/password is "valid"
    auth.logIn(email);
    router.push("/dashboard");
  }

  function handleSkip() {
    auth.logIn();
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-50">
            Sign in to HarmonyDesk
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Secure access to your sessions, clients, and schedule.
          </p>
        </div>

        {/* Sign-in form (Phase 1: fake auth, but real flow) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-200"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-200"
              >
                Password
              </label>
              <button
                type="button"
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            Sign in
          </button>
        </form>

        <p className="mt-3 text-[11px] text-center text-slate-500">
          For now, you can use <span className="text-slate-300">any</span> email
          and password. We&apos;ll connect real accounts later.
        </p>

        <div className="mt-6 text-center flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Skip for now – go to dashboard
          </button>
          <Link
            href="/"
            className="text-[11px] text-slate-500 hover:text-slate-300"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
