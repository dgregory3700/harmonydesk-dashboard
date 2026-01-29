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
import { auth } from "@/lib/auth";

type BillingStatus = {
  user_email: string;
  status: string;
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

  const [billingEnabled, setBillingEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (!auth.isLoggedIn()) {
          setBillingEnabled(null);
          return;
        }

        const email = auth.getUserEmail();
        if (!email) {
          setBillingEnabled(null);
          return;
        }

        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "https://api.harmonydesk.ai";

        const res = await fetch(
          `${baseUrl}/api/billing/status?email=${encodeURIComponent(email)}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          // Safer default: lock down if billing lookup fails
          setBillingEnabled(false);
          return;
        }

        const data: BillingStatus = await res.json();
        setBillingEnabled(Boolean(data.enabled));
      } catch {
        // Safer default: lock down if anything fails
        setBillingEnabled(false);
      }
    };

    run();
  }, []);

  // When NOT enabled, allow only these pages:
  const allowedWhenLocked = useMemo(() => {
    return new Set(["/dashboard", "/billing", "/settings"]);
  }, []);

  const isLocked = billingEnabled === false;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm">
      {/* Brand / logo bar */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 bg-white">
        <span className="text-lg font-semibold text-slate-900">
          <span className="text-sky-600">Harmony</span>Desk
        </span>
      </div>

      {/* Optional lock notice */}
      {isLocked && (
        <div className="mx-3 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Subscription required to unlock all features.
          <div className="mt-1 text-amber-800">
            Go to <span className="font-semibold">Billing</span> to manage your plan.
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1 bg-white">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          const disabled = isLocked && !allowedWhenLocked.has(item.href);

          const baseClass =
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition";

          const activeClass = active
            ? "bg-sky-100 text-sky-900 font-semibold"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900";

          const disabledClass =
            "text-slate-400 bg-white cursor-not-allowed opacity-60";

          if (disabled) {
            return (
              <div
                key={item.href}
                className={`${baseClass} ${disabledClass}`}
                title="Locked until subscription is active"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${baseClass} ${activeClass}`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 text-xs text-slate-500 bg-white">
        © {new Date().getFullYear()} HarmonyDesk
      </div>
    </aside>
  );
}
