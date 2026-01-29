"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

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
    try {
      if (!auth.isLoggedIn()) {
        router.push("/login");
        return;
      }

      const userEmail = auth.getUserEmail();
      if (!userEmail) {
        router.push("/login");
        return;
      }

      setEmail(userEmail);
      fetchBillingStatus(userEmail);
    } catch {
      router.push("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchBillingStatus(userEmail: string) {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "https://api.harmonydesk.ai";

      const res = await fetch(
        `${baseUrl}/api/billing/status?email=${encodeURIComponent(userEmail)}`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error("Billing status fetch failed");

      const data: BillingStatus = await res.json();
      setBilling(data);

      // Hard gate → send locked users to Settings (Plan & Subscription card)
      if (!data.enabled) {
        router.push("/settings");
      }
    } catch (err) {
      console.error("Billing status error:", err);
      router.push("/settings");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    auth.logOut();
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
        <span className="text-sm text-slate-700">Welcome back 👋</span>

        <div className="flex items-center gap-2">
          {email && (
            <span className="text-xs font-medium text-slate-900">{email}</span>
          )}
          {renderBillingBadge()}
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="text-xs px-3 py-1 rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
      >
        Log out
      </button>
    </header>
  );
}
