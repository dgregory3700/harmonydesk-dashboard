// src/lib/supabase/client.ts
// Single Supabase browser client for the entire app.
// All "use client" components should import from here.
// Do NOT create additional browser clients anywhere else.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __harmonydeskSupabaseBrowser: SupabaseClient | undefined;
}

export const supabaseBrowser: SupabaseClient =
  globalThis.__harmonydeskSupabaseBrowser ??
  createBrowserClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // prevents URL/session re-processing issues
    },
  });

if (typeof window !== "undefined") {
  globalThis.__harmonydeskSupabaseBrowser = supabaseBrowser;
}

// Backwards-compatible export for components that still use createSupabaseBrowserClient
export function createSupabaseBrowserClient(): SupabaseClient {
  return supabaseBrowser;
}
