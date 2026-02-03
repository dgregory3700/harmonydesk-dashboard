// src/lib/stripe.ts

export type StripeCheckoutSession = {
  id: string;
  created?: number;
  status?: string; // e.g. "complete"
  payment_status?: string; // e.g. "paid"
  customer_details?: { email?: string | null };
};

function requireStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return key;
}

async function stripeGet(path: string, query?: Record<string, string>) {
  const key = requireStripeKey();

  const url = new URL(`https://api.stripe.com${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Stripe fetch failed: ${res.status} ${txt}`);
  }

  return res.json();
}

export async function fetchStripeCheckoutSession(sessionId: string) {
  return (await stripeGet(`/v1/checkout/sessions/${sessionId}`)) as StripeCheckoutSession;
}

/**
 * Fallback: Find the most recent Checkout Session for a given email.
 * Uses Stripe's supported list filter: customer_details[email].
 * (This is exactly what we need when session_id isn't present in the redirect.)
 */
export async function findLatestCheckoutSessionIdByEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;

  // Stripe list endpoint supports filtering by customer_details.email :contentReference[oaicite:3]{index=3}
  const json = await stripeGet("/v1/checkout/sessions", {
    limit: "10",
    "customer_details[email]": cleanEmail,
  });

  const data = (json?.data ?? []) as StripeCheckoutSession[];

  if (!Array.isArray(data) || data.length === 0) return null;

  // Pick the newest session that looks paid/complete
  const sorted = [...data].sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

  const good = sorted.find((s) => {
    const paid = s.payment_status === "paid" || s.status === "complete";
    const hasEmail = (s.customer_details?.email ?? "").trim().toLowerCase() === cleanEmail;
    return paid && hasEmail;
  });

  return good?.id ?? null;
}
