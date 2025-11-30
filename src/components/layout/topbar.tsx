"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

export function Topbar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEmail() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as { email?: string };
        if (!cancelled) {
          setEmail(data.email ?? null);
        }
      } catch {
        // fail silently – we just won't show an email
      }
    }

    loadEmail();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogout() {
    auth.logOut();
    router.push("/login");
  }

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 text-slate-900">
      {/* Left side: greeting + email */}
      <div className="flex flex-col">
        <span className="text-sm text-slate-700">Welcome back 👋</span>
        {email && (
          <span className="text-xs font-medium text-slate-900">
            {email}
          </span>
        )}
      </div>

      {/* Right side: log out button */}
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
