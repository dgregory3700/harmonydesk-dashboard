export type StripeCheckoutSession = {
  id: string;
  status?: string;
  payment_status?: string;
  customer_details?: { email?: string | null };
};

export async function fetchStripeCheckoutSession(sessionId: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");

  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Stripe fetch failed: ${res.status} ${txt}`);
  }

  return (await res.json()) as StripeCheckoutSession;
}
