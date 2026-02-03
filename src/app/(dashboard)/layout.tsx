// src/app/(dashboard)/layout.tsx

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

  // 2) Must have an allowed subscription status
  const allowedStatuses = ["active", "trialing"];

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select(
      "status, user_email, stripe_subscription_id, stripe_customer_id, trial_end_at"
    )
    .eq("user_email", user.email)
    .in("status", allowedStatuses)
    .maybeSingle();

  // If no allowed sub, send to Settings with a message
  if (subError || !sub) {
    redirect("/settings?error=inactive_subscription");
  }

  return <DashboardShell userEmail={user.email}>{children}</DashboardShell>;
}
