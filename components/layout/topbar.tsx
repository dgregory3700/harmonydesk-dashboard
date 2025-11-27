"use client";

import { useRouter } from "next/navigation";

export function Topbar() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // ignore errors for now
    }
    router.push("/login");
  }

  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4">
      <div className="text-sm text-slate-400">Welcome back 👋</div>

      <button
        onClick={handleLogout}
        className="text-xs px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-900"
      >
        Log out
      </button>
    </header>
  );
}

