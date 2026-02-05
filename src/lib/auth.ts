// src/lib/auth.ts
"use client";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

export const auth = {
  async isLoggedIn(): Promise<boolean> {
    const { data } = await supabaseBrowser.auth.getSession();
    return !!data.session?.user;
  },

  async getUserEmail(): Promise<string | null> {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.user?.email ?? null;
  },

  // Kept for compatibility with old code paths.
  // Login should be handled by password authentication.
  async logIn(_email?: string) {
    return;
  },

  async logOut() {
    await supabaseBrowser.auth.signOut();
  },
};
