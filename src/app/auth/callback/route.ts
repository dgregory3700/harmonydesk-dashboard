import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type CookieSetItem = {
  name: string;
  value: string;
  options?: {
    path?: string;
    domain?: string;
    maxAge?: number;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
  };
};

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = url.origin;

  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); // magiclink, signup, recovery, etc.
  const next = url.searchParams.get("next") ?? "/dashboard";

  // We will attach any Supabase cookies to this response
  const response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieSetItem[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // PKCE code flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
    }
    return response;
  }

  // token_hash flow (common with email links)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
    }
    return response;
  }

  return NextResponse.redirect(new URL("/login?error=missing_token", origin));
}
