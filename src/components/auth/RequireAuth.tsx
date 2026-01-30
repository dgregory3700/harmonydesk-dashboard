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
    let mounted = true;

    async function check() {
      try {
        const ok = await auth.isLoggedIn();

        if (!mounted) return;

        if (ok) {
          setAllowed(true);
        } else {
          setAllowed(false);
          router.replace("/login");
        }
      } catch {
        if (!mounted) return;
        setAllowed(false);
        router.replace("/login");
      } finally {
        if (!mounted) return;
        setChecking(false);
      }
    }

    check();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        Checking your session...
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
