"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  FolderKanban,
  FileText,
  MessageCircle,
  Link2,
  Users,
  Settings,
} from "lucide-react";

type DashboardLayoutProps = {
  children: ReactNode;
};

const navItems = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/calendar", // matches src/app/(dashboard)/calendar/page.tsx
    label: "Calendar",
    icon: Calendar,
  },
  {
    href: "/cases", // matches src/app/(dashboard)/cases/page.tsx
    label: "Cases",
    icon: FolderKanban,
  },
  {
    href: "/billing", // matches src/app/(dashboard)/billing/page.tsx
    label: "Billing & Courts",
    icon: FileText,
  },
  {
    href: "/messages", // matches src/app/(dashboard)/messages/page.tsx
    label: "Messages",
    icon: MessageCircle,
  },
  {
    href: "/booking-links", // matches src/app/(dashboard)/booking-links/page.tsx
    label: "Booking links",
    icon: Link2,
  },
  {
    href: "/clients", // matches src/app/(dashboard)/clients/page.tsx
    label: "Clients",
    icon: Users,
  },
  {
    href: "/settings", // matches src/app/(dashboard)/settings/page.tsx
    label: "Settings",
    icon: Settings,
  },
];

const baseLink =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const activeLink = "bg-sky-50 text-sky-700";
const inactiveLink =
  "text-slate-700 hover:bg-slate-50 hover:text-slate-900";

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="hidden w-64 border-r border-slate-200 bg-white px-4 py-6 md:block">
          <div className="mb-6 px-2">
            <span className="text-lg font-semibold">
              <span className="text-sky-600">Harmony</span>Desk
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));

              const className = `${baseLink} ${
                isActive ? activeLink : inactiveLink
              }`;

              return (
                <Link key={item.href} href={item.href} className={className}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <footer className="mt-8 px-2 text-xs text-slate-400">
            © {new Date().getFullYear()} HarmonyDesk
          </footer>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
            <h1 className="text-sm font-medium text-slate-700">
              HarmonyDesk dashboard
            </h1>
            <span className="text-xs text-slate-400">
              Logged in as tired01@gmail.com
            </span>
          </header>

          <div className="px-4 py-6 md:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
