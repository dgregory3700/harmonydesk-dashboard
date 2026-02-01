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

function toLoginError(origin: string, code: string, message?: string) {
  const u = new URL("/login", origin);
  u.searchParams.set("error", code);
  if (message) u.searchParams.set("message", message.slice(0, 300));
  return NextResponse.redirect(u);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = url.origin;

  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); // "magiclink", "signup", etc.
  const next = url.searchParams.get("next") ?? "/dashboard";

  // Response that will carry cookies
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

  // 1) PKCE/OAuth code flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return toLoginError(origin, "auth_callback_failed", `${error.name}: ${error.message}`);
    }
    return response;
  }

  // 2) OTP magiclink token_hash flow
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    if (error) {
      return toLoginError(origin, "auth_callback_failed", `${error.name}: ${error.message}`);
    }
    return response;
  }

  return toLoginError(origin, "missing_token", "No code/token_hash in callback URL");
}
