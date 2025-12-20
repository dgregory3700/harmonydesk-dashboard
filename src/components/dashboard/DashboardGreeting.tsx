"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/auth";

export function DashboardGreeting() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Runs in the browser – safe to touch localStorage
    const stored = auth.getUserEmail();
    setEmail(stored);
  }, []);

  const nameOrEmail = email || "Mediator";

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
        Welcome back, <span className="text-sky-400">{nameOrEmail}</span>
      </h1>
      <p className="text-sm text-slate-400">
        Here&apos;s a quick snapshot of your HarmonyDesk activity.
      </p>
    </div>
  );
}
