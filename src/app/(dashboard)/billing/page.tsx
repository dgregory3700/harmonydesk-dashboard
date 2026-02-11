import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import BillingOverview from "@/components/billing/BillingOverview";
import { CourtReportsPanel } from "@/components/billing/CourtReportsPanel";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <DashboardGreeting />

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <BillingOverview />
        <CourtReportsPanel />
      </div>
    </div>
  );
}
