"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type BillingStatus = {
  user_email: string;
  status: string;
  trial_end_at: string | null;
  current_period_end_at: string | null;
  enabled: boolean;
};

export default function Topbar() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const { data } = await supabaseBrowser.auth.getUser();
        const sessionEmail = data.user?.email ?? null;

        if (!mounted) return;
        setEmail(sessionEmail);

        if (!sessionEmail) {
          // Do not redirect here; middleware/layout owns auth gating.
          setBilling(null);
          return;
        }

        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "https://api.harmonydesk.ai";

        const res = await fetch(
          `${baseUrl}/api/billing/status?email=${encodeURIComponent(sessionEmail)}`,
          { cache: "no-store" }
        );

        if (!res.ok) throw new Error("Billing status fetch failed");
        const b = (await res.json()) as BillingStatus;

        if (!mounted) return;
        setBilling(b);
      } catch (err) {
        console.error("Topbar error:", err);
        if (!mounted) return;
        setBilling(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
    router.push("/login");
  }

  function renderBillingBadge() {
    if (!billing) return null;

    if (billing.status === "trialing") {
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
          Trial
        </span>
      );
    }

    if (billing.status === "active") {
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
          Active
        </span>
      );
    }

    return (
      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
        Inactive
      </span>
    );
  }

  if (loading) {
    return (
      <header className="h-16 border-b border-slate-200 bg-white flex items-center px-6 text-slate-500 text-sm">
        Loading account status...
      </header>
    );
  }

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 text-slate-900">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-slate-700">Welcome back 👋</span
