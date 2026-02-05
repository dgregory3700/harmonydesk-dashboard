// src/lib/supabaseBrowser.ts
// IMPORTANT:
// This file must be the ONLY place a browser Supabase client is created.
// All client components must import from here.
// Server/admin clients must NEVER be imported into client components.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Global singleton to prevent multiple GoTrueClient instances
declare global {
  // eslint-disable-next-line no-var
  var __harmonydeskSupabaseBrowser: SupabaseClient | undefined;
}

export const supabaseBrowser: SupabaseClient =
  globalThis.__harmonydeskSupabaseBrowser ??
  createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // VERY IMPORTANT: prevents auth callback re-processing
    },
  });

// Cache the instance (safe in browser, prevents duplication on refresh/navigation)
if (typeof window !== "undefined") {
  globalThis.__harmonydeskSupabaseBrowser = supabaseBrowser;
}
