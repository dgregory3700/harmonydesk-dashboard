import "server-only";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Extract and require authenticated user email from a NextRequest.
 * Uses Supabase auth via SSR to get the currently authenticated user.
 * 
 * @param req - The NextRequest object from the API route
 * @returns The authenticated user's email
 * @throws Error if user is not authenticated or email is missing
 */
export async function requireUserEmail(req: NextRequest): Promise<string> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // No-op for API routes - we don't need to set cookies
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    throw new Error("Unauthorized: User not authenticated");
  }

  return user.email;
}
