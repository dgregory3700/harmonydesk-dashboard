// src/app/api/me/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  // Use the same auth helper used elsewhere in HarmonyDesk
  const session = await auth();

  // If there is no logged-in user, just return null email
  if (!session || !session.user) {
    return NextResponse.json({ email: null }, { status: 200 });
  }

  // Safely return the user's email
  return NextResponse.json(
    { email: session.user.email ?? null },
    { status: 200 }
  );
}
