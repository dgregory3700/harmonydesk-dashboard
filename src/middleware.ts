import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1. Define which paths are protected
const PROTECTED_ROUTES = [
  "/dashboard",
  "/cases",
  "/clients",
  "/calendar",
  "/billing",
  "/messages",
  "/settings",
  "/booking-links",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 2. Check if the user is trying to access a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // 3. Look for the "Ticket" (Cookie)
    const session = request.cookies.get("harmony_session");

    // 4. If no ticket, redirect to Login
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      // Optional: Remember where they were trying to go
      // loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 5. Allow access if not protected or if they have a ticket
  return NextResponse.next();
}

// Configure which paths this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - / (landing page)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login|$).*)",
  ],
};
