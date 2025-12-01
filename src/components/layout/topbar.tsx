"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

export default function Topbar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Use the same auth helper the rest of the app uses.
    // It runs on the client, where it has access to cookies/localStorage.
    try {
      if (auth.isLoggedIn()) {
        const userEmail = auth.getUserEmail();
        setEmail(userEmail ?? null);
      } else {
        setEmail(null);
      }
    } catch {
      // If anything goes wrong, just don't show an email.
      setEmail(null);
    }
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
