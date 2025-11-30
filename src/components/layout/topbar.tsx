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
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 text-slate-900">
      {/* Left side: greeting */}
      <div className="flex flex-col">
        <span className="text-sm text-slate-700">Welcome back 👋</span>
        {/* Later we can add the user's email here once we wire it correctly */}
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
