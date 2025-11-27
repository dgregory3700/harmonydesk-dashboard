"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (auth.isLoggedIn()) {
      setAllowed(true);
      setChecking(false);
    } else {
      // Not logged in – send to login page
      router.replace("/login");
    }
  }, [router]);

  if (checking && !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        Checking your session...
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
