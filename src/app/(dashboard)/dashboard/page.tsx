import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { SessionsOverview } from "@/components/dashboard/SessionsOverview";
import { TodayPanel } from "@/components/dashboard/TodayPanel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Fetch real data from API endpoints with relative URLs (works in server components)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const casesRes = await fetch(`${baseUrl}/api/cases`, { 
    cache: "no-store" 
  });
  const sessionsRes = await fetch(`${baseUrl}/api/sessions`, { 
    cache: "no-store" 
  });

  let upcomingSessions = 0;
  let newInquiries = 0;

  // Parse and compute stats
  try {
    const cases = await casesRes.json();
    const sessions = await sessionsRes.json();

    // Count upcoming sessions (not completed and date >= now)
    const now = new Date();
    upcomingSessions = sessions.filter((session: any) => {
      if (session.completed) return false;
      const sessionDate = new Date(session.date);
      return sessionDate >= now;
    }).length;

    // Count new inquiries (cases with "Open" status)
    newInquiries = cases.filter((c: any) => c.status === "Open").length;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    // Keep default values of 0 if fetch fails
  }

  const stats = [
    { label: "Upcoming sessions", value: upcomingSessions },
    { label: "New inquiries", value: newInquiries },
    { label: "Messages to review", value: 0 },
    { label: "Booking rate (7d)", value: "0%" },
  ];

  return (
    <div className="space-y-6">
      <DashboardGreeting />

      {/* Top stats row */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-4 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-400">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">
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
  );
}
