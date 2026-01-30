"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url, anonKey);
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  const supabase = useMemo(() => getSupabaseClient(), []);
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState<string>("Finishing sign-in…");

  useEffect(() => {
    async function run() {
      try {
        const code = params.get("code");
        const error = params.get("error");
        const errorDesc = params.get("error_description");

        if (error) {
          setStatus("error");
          setMessage(errorDesc || error || "Auth callback failed.");
          return;
        }

        if (!code) {
          setStatus("error");
          setMessage("Missing auth code in callback URL.");
          return;
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          code
        );

        if (exchangeError) {
          setStatus("error");
          setMessage(exchangeError.message);
          return;
        }

        setStatus("ok");
        setMessage("Signed in. Redirecting…");

        // go to app
        router.replace("/dashboard");
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message ?? "Unexpected error in auth callback.");
      }
    }

    run();
  }, [params, router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h1 className="text-lg font-semibold">
          {status === "working" ? "Signing you in…" : status === "ok" ? "Success" : "Sign-in error"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}
