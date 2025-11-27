// src/lib/auth.ts

// Just a tiny dev-only auth store using localStorage.
export const auth = {
  isLoggedIn(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hd_logged_in") === "true";
  },
  
  logIn() {
    if (typeof window === "undefined") return;
    localStorage.setItem("hd_logged_in", "true");
  },
  
  logOut() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("hd_logged_in");
  }
};
