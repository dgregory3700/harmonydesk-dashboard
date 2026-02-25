import Link from "next/link";
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

type CaseStatus = "Open" | "Upcoming" | "Closed" | string;

type MediationSession = {
  id: string;
  caseId: string;
  date: string; // ISO
  completed: boolean;
  durationHours?: number;
  notes?: string | null;
  caseLabel?: string;
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

function pickString(row: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function buildCaseLabel(row: any): string | null {
  if (!row) return null;

  const caseNumber = pickString(row, [
    "case_number",
    "caseNumber",
    "case_no",
    "caseNo",
    "number",
    "case_ref",
    "caseRef",
  ]);

  const matterOrTitle = pickString(row, [
    "matter",
    "title",
    "case_title",
    "caseTitle",
    "description",
  ]);

  const parties = pickString(row, [
    "parties",
    "party_names",
    "partyNames",
    "participants",
  ]);

  const parts: string[] = [];
  if (caseNumber) parts.push(caseNumber);
  if (matterOrTitle) parts.push(matterOrTitle);
  else if (parties) parts.push(parties);

  if (parts.length === 0) return null;
  return parts.join(" • ");
}

function startOfWeekUtc(d: Date) {
  // Monday 00:00 UTC (stable regardless of server locale)
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // back to Monday
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export default async function DashboardPage() {
  // fail-soft defaults
  let upcomingSessionsCount = 0;
  let draftInvoicesCount = 0;
  let unsentEmailsCount = 0;
  let thisWeekSessionsCount = 0;

  let upcomingSessions: MediationSession[] = [];

  try {
    const auth = await requireAuthedSupabase();
    if (auth.ok) {
      const { supabase, userEmail } = auth;

      const now = new Date();
      const nowIso = now.toISOString();
      const nowMs = Date.now();

      /**
       * 1) Upcoming sessions (future + not completed)
       * Exclude sessions whose parent case is Closed.
       */
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("id,user_email,case_id,date,duration_hours,notes,completed")
        .eq("user_email", userEmail)
        .eq("completed", false)
        .gt("date", nowIso)
        .order("date", { ascending: true });

      const rawUpcoming = (sessionsData ?? [])
        .map(mapRowToSession)
        .filter((s) => {
          const ms = parseMillis(s.date);
          return ms !== null && ms > nowMs;
        });

      let filteredUpcoming = rawUpcoming;

      const caseLabelById = new Map<string, string>();
      const statusById = new Map<string, CaseStatus>();

      if (rawUpcoming.length > 0) {
        const caseIds = Array.from(
          new Set(rawUpcoming.map((s) => s.caseId).filter(Boolean))
        );

        if (caseIds.length > 0) {
          const { data: casesData, error: casesErr } = await supabase
            .from("cases")
            .select("*")
            .eq("user_email", userEmail)
            .in("id", caseIds);

          if (casesErr) {
            console.error("Dashboard cases lookup error:", casesErr);
          } else {
            for (const row of casesData ?? []) {
              const id = String((row as any).id);
              const st = ((row as any).status ?? "") as CaseStatus;
              if (st) statusById.set(id, st);

              const label = buildCaseLabel(row);
              if (label) caseLabelById.set(id, label);
            }

            filteredUpcoming = rawUpcoming.filter((s) => {
              const st = statusById.get(s.caseId);
              if (!st) return true;
              return st !== "Closed";
            });
          }
        }
      }

      const enriched = filteredUpcoming.map((s) => ({
        ...s,
        caseLabel: caseLabelById.get(s.caseId) ?? undefined,
      }));

      upcomingSessions = enriched.slice(0, 6);
      upcomingSessionsCount = enriched.length;

      /**
       * 2) Draft invoices
       */
      const { count: draftCount } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("user_email", userEmail)
        .eq("status", "Draft");

      draftInvoicesCount = Number(draftCount ?? 0);

      /**
       * 3) Unsent emails (pending/failed)
       */
      const { count: unsentCount, error: unsentErr } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("user_email", userEmail)
        .in("email_status", ["pending", "failed"]);

      if (unsentErr) {
        console.error("Dashboard unsent emails count error:", unsentErr);
        unsentEmailsCount = 0;
      } else {
        unsentEmailsCount = Number(unsentCount ?? 0);
      }

      /**
       * 4) This week’s sessions (completed OR scheduled within this week window)
       * Operational, non-inflating metric.
       */
      const weekStart = startOfWeekUtc(now);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

      const { count: weekCount, error: weekErr } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_email", userEmail)
        .gte("date", weekStart.toISOString())
        .lt("date", weekEnd.toISOString());

      if (weekErr) {
        console.error("Dashboard this-week sessions count error:", weekErr);
        thisWeekSessionsCount = 0;
      } else {
        thisWeekSessionsCount = Number(weekCount ?? 0);
      }
    }
  } catch {
    // keep fail-soft zeros
  }

  const stats: Array<{
    label: string;
    value: number;
    href: string;
    hint: string;
  }> = [
    {
      label: "Upcoming sessions",
      value: upcomingSessionsCount,
      href: "/calendar",
      hint: "View schedule",
    },
    {
      label: "This week’s sessions",
      value: thisWeekSessionsCount,
      href: "/calendar",
      hint: "Plan this week",
    },
    {
      label: "Draft invoices",
      value: draftInvoicesCount,
      href: "/billing",
      hint: "Prepare & send",
    },
    {
      label: "Unsent emails",
      value: unsentEmailsCount,
      href: "/messages",
      hint: "Fix & resend",
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardGreeting />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-4 shadow-sm transition hover:border-slate-700 hover:bg-slate-900/70"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-400">{s.label}</p>
              <p className="text-[11px] text-slate-500 group-hover:text-slate-300">
                {s.hint} →
              </p>
            </div>

            <p className="mt-2 text-2xl font-semibold text-slate-100">
              {s.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <SessionsOverview sessions={upcomingSessions} />
        <TodayPanel />
      </div>
    </div>
  );
}
