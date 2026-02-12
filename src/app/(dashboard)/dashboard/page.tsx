import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { SessionsOverview } from "@/components/dashboard/SessionsOverview";
import { TodayPanel } from "@/components/dashboard/TodayPanel";

export const dynamic = "force-dynamic";

type MediationSession = {
  id: string;
  date?: string | null;
  completed?: boolean | null;
};

type MediationCase = {
  id: string;
  status?: string | null;
};

async function safeJson<T>(res: Response): Promise<T> {
  // If the API returns empty body for any reason, avoid throwing
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

export default async function DashboardPage() {
  // Default values if anything fails
  let upcomingSessions = 0;
  let newInquiries = 0;

  try {
    const [sessionsRes, casesRes] = await Promise.all([
      fetch("/api/sessions", { cache: "no-store" }),
      fetch("/api/cases", { cache: "no-store" }),
    ]);

    if (sessionsRes.ok) {
      const sessions = (await safeJson<MediationSession[]>(sessionsRes)) ?? [];
      const nowIso = new Date().toISOString();
      upcomingSessions = sessions.filter((s) => {
        const notCompleted = !s.completed;
        const hasFutureDate = typeof s.date === "string" && s.date >= nowIso;
        return notCompleted && hasFutureDate;
      }).length;
    }

    if (casesRes.ok) {
      const cases = (await safeJson<MediationCase[]>(casesRes)) ?? [];
      // Keep this simple for now: treat "Open" as a new inquiry (matches your Copilot logic)
      newInquiries = cases.filter((c) => c.status === "Open").length;
    }
  } catch {
    // Swallow errors and render zeros (keeps dashboard stable)
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
