// src/lib/supabase/client.ts

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // IMPORTANT:
  // Use @supabase/ssr browser client so auth state is stored in cookies,
  // which allows middleware/server components to see the session.
  return createBrowserClient(url, anon);
}
