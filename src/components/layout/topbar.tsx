"use client";

import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserEmail } from "@/lib/auth"; // optional helper, safe if missing

export default function Topbar() {
  const router = useRouter();

  // getUserEmail() may be undefined if you don’t use the helper.
  // If so, you can remove this line safely.
  const email = getUserEmail?.() ?? "";

  function handleLogout() {
    auth.logOut();
    router.push("/login");
  }

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 text-slate-900">
      
      {/* Left Section: Welcome text */}
      <div className="flex flex-col">
        <span className="text-sm text-slate-700">Welcome back 👋</span>
        {email && (
          <span className="text-xs font-medium text-slate-900">{email}</span>
        )}
      </div>

      {/* Right Section: Logout button */}
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
