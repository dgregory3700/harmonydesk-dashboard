"use client";

import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

export function Topbar() {
  const router = useRouter();

  function handleLogout() {
    auth.logOut();
    router.push("/login");
  }

  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4">
      <div className="text-sm text-slate-400">Welcome back 👋</div>

      <button
        type="button"
        onClick={handleLogout}
        className="text-xs px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-900 text-slate-100"
      >
        Log out
      </button>
    </header>
  );
}

