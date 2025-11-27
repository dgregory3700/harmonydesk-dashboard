// src/lib/auth.ts

const LOGGED_IN_KEY = "hd_logged_in";
const EMAIL_KEY = "hd_user_email";

// Just a tiny dev-only auth store using localStorage.
export const auth = {
  isLoggedIn(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LOGGED_IN_KEY) === "true";
  },

  getUserEmail(): string | null {
    if (typeof window === "undefined") return null;
    const email = localStorage.getItem(EMAIL_KEY);
    return email && email.trim() !== "" ? email : null;
  },

  logIn(email?: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOGGED_IN_KEY, "true");
    if (email) {
      localStorage.setItem(EMAIL_KEY, email);
    }
  },

  logOut() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LOGGED_IN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  },
};
