// src/app/api/stripe/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";
import {
  createCustomerPortalSession,
  fetchStripeCheckoutSession,
  findLatestCheckoutSessionIdByEmail,
} from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { userEmail } = auth;

    // Find the most recent paid/complete Checkout Session for this email
    const sessionId = await findLatestCheckoutSessionIdByEmail(userEmail);
    if (!sessionId) {
      return NextResponse.json(
        {
          error:
            "No Stripe purchase found for this account. If you recently purchased, please wait a moment and try again.",
        },
        { status: 404 }
      );
    }

    const session = await fetchStripeCheckoutSession(sessionId);

    const customerId = (session as any)?.customer as string | null | undefined;
    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json(
        {
          error:
            "Unable to open portal (missing Stripe customer). Please contact support.",
        },
        { status: 502 }
      );
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://www.harmonydesk.ai";

    const returnUrl = `${origin}/settings`;

    const portal = await createCustomerPortalSession(customerId, returnUrl);

    if (!portal?.url) {
      return NextResponse.json(
        { error: "Portal URL missing. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: portal.url });
  } catch (err: any) {
    console.error("POST /api/stripe/portal error:", err);
    return NextResponse.json(
      { error: err?.message ? String(err.message) : "Server error" },
      { status: 500 }
    );
  }
}
