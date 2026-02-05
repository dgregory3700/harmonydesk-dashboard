import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthSuccess = {
  ok: true;
  email: string;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

type AuthResult = AuthSuccess | AuthFailure;

/**
 * Validates user authentication and extracts email from the authenticated session.
 * Returns 401 Unauthorized if the user is not authenticated or email cannot be determined.
 * 
 * Usage:
 * ```
 * const auth = await requireUserEmail(request);
 * if (!auth.ok) return auth.response;
 * const userEmail = auth.email;
 * ```
 */
export async function requireUserEmail(_request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ),
      };
    }

    return {
      ok: true,
      email: user.email,
    };
  } catch (err) {
    console.error("requireUserEmail error:", err);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }
}
