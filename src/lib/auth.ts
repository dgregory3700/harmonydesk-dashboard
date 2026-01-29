// src/lib/auth.ts
import { supabaseBrowser } from "@/lib/supabaseBrowser";

// Compatibility wrapper: keeps the old auth.* API surface
// but uses Supabase session as the source of truth.
export const auth = {
  async isLoggedIn(): Promise<boolean> {
    const { data } = await supabaseBrowser.auth.getSession();
    return Boolean(data.session);
  },

  async getUserEmail(): Promise<string | null> {
    const { data } = await supabaseBrowser.auth.getSession();
    const email = data.session?.user?.email ?? null;
    return email && email.trim() !== "" ? email : null;
  },

  // For magic link flow, "logIn" isn't used the same way anymore.
  // Keep it here so old code doesn't crash; it does nothing.
  logIn(_email?: string) {
    // no-op
  },

  async logOut() {
    await supabaseBrowser.auth.signOut();
  },
};
