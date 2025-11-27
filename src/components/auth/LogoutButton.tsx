"use client";

import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    auth.logOut();
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-xs font-medium text-slate-300 hover:text-white border border-slate-700 rounded-full px-3 py-1"
    >
      Log out
    </button>
  );
}
