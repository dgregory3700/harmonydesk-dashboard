import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Read the same cookie your fake auth uses (hd_user_email)
function getUserEmail(): string {
  const cookieStore = cookies();

  const candidate =
    cookieStore.get("hd_user_email") ||
    cookieStore.get("hd-user-email") ||
    cookieStore.get("user_email") ||
    cookieStore.get("userEmail") ||
    cookieStore.get("email");

  if (candidate?.value) {
    return candidate.value;
  }

  // Fallback identity if no cookie found
  return "dev-mediator@harmonydesk.local";
}

export async function GET() {
  const email = getUserEmail();
  return NextResponse.json({ email });
}
