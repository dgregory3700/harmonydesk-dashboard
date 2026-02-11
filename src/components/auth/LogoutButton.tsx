"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
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
