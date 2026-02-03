"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export function DashboardGreeting() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        if (!mounted) return;
        setEmail(data.session?.user?.email ?? null);
      } catch {
        if (!mounted) return;
        setEmail(null);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, []);

  const nameOrEmail = email || "Mediator";

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
        Welcome back,{" "}
        <span className="text-sky-400">{nameOrEmail}</span>
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Here&apos;s a quick snapshot of your HarmonyDesk activity.
      </p>
    </div>
  );
}
