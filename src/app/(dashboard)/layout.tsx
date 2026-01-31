import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import DashboardShell from "./DashboardShell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) Must be logged in
  if (!user?.email) {
    redirect("/login?next=/dashboard");
  }

  // 2) Must have an active subscription (email-based, matches your current table)
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("status, user_email, stripe_subscription_id, stripe_customer_id, trial_end_at")
    .eq("user_email", user.email)
    .eq("status", "active")
    .maybeSingle();

  // If no active sub, send to Settings (or Billing) with a message
  if (subError || !sub) {
    redirect("/settings?error=inactive_subscription");
  }

  return (
    <DashboardShell userEmail={user.email}>
      {children}
    </DashboardShell>
  );
}
