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
    href: "/calendar",
    label: "Calendar",
    icon: Calendar,
  },
  {
    href: "/cases",
    label: "Cases",
    icon: FolderKanban,
  },
  {
    href: "/billing",
    label: "Billing & Courts",
    icon: FileText,
  },
  {
    href: "/messages",
    label: "Messages",
    icon: MessageCircle,
  },
  {
    href: "/booking-links",
    label: "Booking links",
    icon: Link2,
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

// --- DARK MODE STYLING ---
const baseLink =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

// Active Link: Subtle glow with blue text
const activeLink = "bg-sky-500/10 text-sky-400"; 

// Inactive Link: Muted gray, brightens on hover
const inactiveLink =
  "text-slate-400 hover:bg-slate-800 hover:text-slate-200";

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    // Outer Shell: Deep dark background
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto flex max-w-7xl">
        
        {/* Sidebar: Dark slate background with a subtle border */}
        <aside className="hidden w-64 border-r border-slate-800 bg-slate-900/50 px-4 py-6 md:block">
          <div className="mb-6 px-2">
            <span className="text-lg font-semibold text-slate-100">
              <span className="text-sky-500">Harmony</span>Desk
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Check if link is active
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

          <footer className="mt-8 px-2 text-xs text-slate-500">
            © {new Date().getFullYear()} HarmonyDesk
          </footer>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1">
          {/* Header: Matches the sidebar darkness */}
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 md:px-6">
            <h1 className="text-sm font-medium text-slate-400">
              HarmonyDesk dashboard
            </h1>
            <span className="text-xs text-slate-500">
              Logged in as tired01@gmail.com
            </span>
          </header>

          <div className="px-4 py-6 md:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
