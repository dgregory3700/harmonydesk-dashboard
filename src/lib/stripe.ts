// src/lib/stripe.ts

export type StripeCheckoutSession = {
  id: string;
  created?: number;
  status?: string; // e.g. "complete"
  payment_status?: string; // e.g. "paid"
  customer_details?: { email?: string | null };
};

type StripeListResponse<T> = {
  object?: string;
  data?: T[];
  has_more?: boolean;
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
 * Uses Stripe list filter: customer_details[email]
 */
export async function findLatestCheckoutSessionIdByEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;

  const json = (await stripeGet("/v1/checkout/sessions", {
    limit: "10",
    "customer_details[email]": cleanEmail,
  })) as StripeListResponse<StripeCheckoutSession>;

  const data = Array.isArray(json?.data) ? json.data : [];
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => (b.created ?? 0) - (a.created ?? 0));

  const good = sorted.find((s) => {
    const paid = s.payment_status === "paid" || s.status === "complete";
    const hasEmail =
      (s.customer_details?.email ?? "").trim().toLowerCase() === cleanEmail;
    return paid && hasEmail;
  });

  return good?.id ?? null;
}
