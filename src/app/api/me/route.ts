// src/app/api/me/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

// If you have a Database type in your project, you can import and use it:
// import type { Database } from "@/lib/database.types";
// const supabase = createRouteHandlerClient<Database>({ cookies });

// To keep things simple and safe, we'll omit the generic for now:
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    // Not logged in or error – just return null email
    return NextResponse.json({ email: null }, { status: 200 });
  }

  // Return the Supabase user email – no hard-coded dev email
  return NextResponse.json({ email: session.user.email ?? null }, { status: 200 });
}
