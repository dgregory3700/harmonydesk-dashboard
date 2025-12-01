// src/app/api/me/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // Endpoint kept for future use, currently returns no email.
  return NextResponse.json({ email: null }, { status: 200 });
}
