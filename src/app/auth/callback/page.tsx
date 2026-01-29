"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function finish() {
      // Supabase handles the session automatically after redirect.
      const { data } = await supabaseBrowser.auth.getSession();

      if (!mounted) return;

      if (data.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }

    finish();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      Finishing sign in...
    </div>
  );
}
