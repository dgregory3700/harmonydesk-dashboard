"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Overview" },
    { href: "/calendar", label: "Calendar" },
    { href: "/cases", label: "Cases" },
    { href: "/billing", label: "Billing & Courts" },
    { href: "/messages", label: "Messages" },
    { href: "/booking-links", label: "Booking links" },
    { href: "/clients", label: "Clients" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="light bg-white min-h-screen">
      <div className="flex h-screen">

        {/* SIDEBAR */}
        <aside className="w-60 border-r bg-white p-4 flex flex-col">
          <h1 className="text-xl font-bold mb-6 text-blue-600">HarmonyDesk</h1>

          <nav className="space-y-1 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm font-medium",
                  pathname === item.href
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-gray-400 mt-6">© {new Date().getFullYear()} HarmonyDesk</p>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
