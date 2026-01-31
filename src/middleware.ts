import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Keep your existing protected routes list (expanded to match your app)
const PROTECTED_ROUTES = [
  '/dashboard',
  '/cases',
  '/clients',
  '/calendar',
  '/billing',
  '/messages',
  '/settings',
  '/booking-links',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only enforce auth on protected routes
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  // Always create a response we can attach refreshed cookies to
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Supabase SSR client wired to Next cookies (request in, response out)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // This call refreshes the session if needed and lets us know if user exists
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    // Preserve where they were headed (optional but helpful)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - next static/image
     * - favicon
     * - public entry pages
     */
    '/((?!api|_next/static|_next/image|favicon.ico|$).*)',
  ],
}
