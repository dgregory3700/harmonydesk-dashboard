"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  FolderKanban,
  Inbox,
  Link2,
  Users,
  Settings,
  FileText,
} from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase/client";

type BillingStatus = {
  user_email: string;
  status: string; // "trialing" | "active" | "inactive" | "none"
  trial_end_at: string | null;
  current_period_end_at: string | null;
  enabled: boolean;
};

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/cases", label: "Cases", icon: FolderKanban },
  { href: "/billing", label: "Billing & Courts", icon: FileText },
  { href: "/messages", label: "Messages", icon: Inbox },
  { href: "/booking-links", label: "Booking links", icon: Link2 },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const [email, setEmail] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const apiBaseUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL || "https://api.harmonydesk.ai";
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadEmail() {
      try {
        const { data } = await supabaseBrowser.auth.getUser();
        if (!mounted) return;
        setEmail(data.user?.email ?? null);
      } catch {
        if (!mounted) return;
        setEmail(null);
      }
    }

    loadEmail();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadBilling() {
      if (!email) {
        setBilling(null);
        return;
      }

      try {
        setBillingLoading(true);

        const res = await fetch(
          `${apiBaseUrl}/api/billing/status?email=${encodeURIComponent(email)}`,
          { cache: "no-store" }
        );

        if (!res.ok) throw new Error("Failed to load billing status");
        const data = (await res.json()) as BillingStatus;

        if (!mounted) return;
        setBilling(data);
      } catch {
        if (!mounted) return;
        setBilling(null);
      } finally {
        if (!mounted) return;
        setBillingLoading(false);
      }
    }

    loadBilling();

    return () => {
      mounted = false;
    };
  }, [email, apiBaseUrl]);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm">
      <div className="h-16 flex items-center px-4 border-b border-slate-200 bg-white">
        <span className="text-lg font-semibold text-slate-900">
          <span className="text-sky-600">Harmony</span>Desk
        </span>
      </div>

      <div className="px-4 py-2 border-b border-slate-200 bg-white">
        <div className="text-[11px] text-slate-600 truncate">
          {email ? `Signed in: ${email}` : "Signed in: (unknown)"}
        </div>
        <div className="text-[11px] text-slate-500">
          {billingLoading
            ? "Checking plan…"
            : billing?.enabled
            ? `Access: ${billing.status}`
            : "Access: locked"}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1 bg-white">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                active
                  ? "bg-sky-100 text-sky-900 font-semibold"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 text-xs text-slate-500 bg-white">
        © {new Date().getFullYear()} HarmonyDesk
      </div>
    </aside>
  );
}
