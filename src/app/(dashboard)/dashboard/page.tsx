import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { SessionsOverview } from "@/components/dashboard/SessionsOverview";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import { requireAuthedSupabase } from "@/lib/authServer";

export const dynamic = "force-dynamic";

type SessionRow = {
  id: string;
  user_email: string;
  case_id: string;
  date: string;
  duration_hours: number | null;
  notes: string | null;
  completed: boolean;
};

type MediationSession = {
  id: string;
  caseId: string;
  date: string; // ISO
  completed: boolean;
  durationHours?: number;
  notes?: string | null;
};

function mapRowToSession(row: SessionRow): MediationSession {
  return {
    id: row.id,
    caseId: row.case_id,
    date: row.date,
    completed: Boolean(row.completed),
    durationHours: Number(row.duration_hours ?? 0),
    notes: row.notes ?? null,
  };
}

function parseMillis(iso?: string | null): number | null {
  if (!iso || typeof iso !== "string") return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export default async function DashboardPage() {
  // Default values if anything fails (stability > perfection)
  let upcomingSessionsCount = 0;
  let newInquiriesCount = 0;
  let draftInvoicesCount = 0;

  let upcomingSessions: MediationSession[] = [];

  try {
    const auth = await requireAuthedSupabase();
    if (auth.ok) {
      const { supabase, userEmail } = auth;

      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      // 1) Upcoming sessions (future + not completed)
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("id,user_email,case_id,date,duration_hours,notes,completed")
        .eq("user_email", userEmail)
        .eq("completed", false)
        .order("date", { ascending: true });

      const sessions = (sessionsData ?? [])
        .map(mapRowToSession)
        .filter((s) => {
          const ms = parseMillis(s.date);
          return ms !== null && ms > nowMs;
        });

      upcomingSessions = sessions.slice(0, 6);
      upcomingSessionsCount = sessions.length;

      // 2) New inquiries (truth rule: status === "Open")
      /**
       * Truth rule:
       * We treat cases with status === "Open" as "New inquiries".
       */
      const { count: openCasesCount } = await supabase
        .from("cases")
        .select("id", { count: "exact", head: true })
        .eq("user_email", userEmail)
        .eq("status", "Open");

      newInquiriesCount = Number(openCasesCount ?? 0);

      // 3) Draft invoices (status === "Draft")
      const { count: draftCount } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("user_email", userEmail)
        .eq("status", "Draft");

      draftInvoicesCount = Number(draftCount ?? 0);

      // (nowIso kept in case you want it later)
      void nowIso;
    }
  } catch {
    // Swallow errors and render zeros/empty state (keeps dashboard stable)
  }

  const stats = [
    { label: "Upcoming sessions", value: upcomingSessionsCount },
    { label: "New inquiries", value: newInquiriesCount },
    { label: "Draft invoices", value: draftInvoicesCount },
  ];

  return (
    <div className="space-y-6">
      <DashboardGreeting />

      {/* Top stats row */}
      <div className="grid gap-4 md:grid-cols-3">
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
        <SessionsOverview sessions={upcomingSessions} />
        <TodayPanel
          upcomingSessionsCount={upcomingSessionsCount}
          newInquiriesCount={newInquiriesCount}
          draftInvoicesCount={draftInvoicesCount}
        />
      </div>
    </div>
  );
}
