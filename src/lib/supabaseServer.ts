// src/lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side admin client (service role key).
 * Used by API routes that need privileged DB access.
 *
 * IMPORTANT: Never import this in client components.
 */

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
