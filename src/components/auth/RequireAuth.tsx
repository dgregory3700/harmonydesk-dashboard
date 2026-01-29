"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type RequireAuthProps = {
  children: ReactNode;
};

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel env vars."
    );
  }

  return createClient(url, anonKey);
}

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();

  const supabase = useMemo(() => getSupabaseClient(), []);

  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        setChecking(true);

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const hasSession = Boolean(data.session);
        if (!mounted) return;

        if (hasSession) {
          setAllowed(true);
          setChecking(false);
          return;
        }

        // No session: send to login
        setAllowed(false);
        setChecking(false);
        router.replace("/login");
      } catch (err) {
        console.error("RequireAuth session check failed:", err);
        if (!mounted) return;
        setAllowed(false);
        setChecking(false);
        router.replace("/login");
      }
    }

    check();

    // If session changes (login/logout), react immediately.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (session) {
        setAllowed(true);
        setChecking(false);
      } else {
        setAllowed(false);
        setChecking(false);
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        Checking your session...
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
