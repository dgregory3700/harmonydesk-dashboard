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
    <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800">
      <div className="h-16 flex items-center px-4 border-b border-slate-800">
        <span className="text-lg font-semibold">
          <span className="text-indigo-400">Harmony</span>Desk
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        © {new Date().getFullYear()} HarmonyDesk
      </div>
    </aside>
  );
}

