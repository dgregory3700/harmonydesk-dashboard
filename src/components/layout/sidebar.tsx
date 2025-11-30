"use client";

import Link from "next/link";
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

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm">
      {/* Brand / logo bar */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 bg-white">
        <span className="text-lg font-semibold text-slate-900">
          <span className="text-sky-600">Harmony</span>Desk
        </span>
      </div>

      {/* Navigation */}
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

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 text-xs text-slate-500 bg-white">
        © {new Date().getFullYear()} HarmonyDesk
      </div>
    </aside>
  );
}
