// src/lib/billing.ts
export type BillingStatus = {
  user_email: string;
  status: string;
  trial_end_at: string | null;
  current_period_end_at: string | null;
  enabled: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.harmonydesk.ai";

export async function fetchBillingStatus(email: string): Promise<BillingStatus> {
  const url = `${API_BASE}/api/billing/status?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Billing status fetch failed: ${res.status}`);
  return res.json();
}
