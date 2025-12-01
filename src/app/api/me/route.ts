// src/app/api/me/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  let email: string | null = null;

  try {
    // auth is an object with helper methods, not a function.
    // We use the same helper that other parts of the app use.
    email = auth.getUserEmail();
  } catch (error) {
    // If anything goes wrong (for example, helper not usable on server),
    // we just fall back to null and avoid breaking the route.
    email = null;
  }

  return NextResponse.json(
    { email: email ?? null },
    { status: 200 }
  );
}
