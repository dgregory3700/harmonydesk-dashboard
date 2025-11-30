import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getUserEmail(): Promise<string> {
  const cookieStore = await cookies();

  // Look for the same cookie names we used for invoices
  const candidate =
    cookieStore.get("hd_user_email") ||
    cookieStore.get("hd-user-email") ||
    cookieStore.get("user_email") ||
    cookieStore.get("userEmail") ||
    cookieStore.get("email");

  if (candidate?.value) {
    return candidate.value;
  }

  // Fallback single dev mediator identity (same idea as invoices)
  return "dev-mediator@harmonydesk.local";
}

export async function GET() {
  const email = await getUserEmail();
  return NextResponse.json({ email });
}
