import { RequireAuth } from "@/components/auth/RequireAuth";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { SessionsOverview } from "@/components/dashboard/SessionsOverview";
import { TodayPanel } from "@/components/dashboard/TodayPanel";

export default function DashboardPage() {
  const stats = [
    { label: "Upcoming sessions", value: 5 },
    { label: "New inquiries", value: 3 },
    { label: "Messages to review", value: 4 },
    { label: "Booking rate (7d)", value: "62%" },
  ];

  return (
    <RequireAuth>
      <div className="space-y-6">
        <DashboardGreeting />

        {/* Top stats row */}
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm"
            >
              <p className="text-xs text-slate-600">{s.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Main content row: sessions + today panel */}
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <SessionsOverview />
          <TodayPanel />
        </div>
      </div>
    </RequireAuth>
  );
}
