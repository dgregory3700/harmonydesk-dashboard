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

  // Enriched display fields (fail-soft)
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

  // Try many likely column names (schema-agnostic)
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

  // Prefer matter/title; fall back to parties
  if (matterOrTitle) parts.push(matterOrTitle);
  else if (parties) parts.push(parties);

  if (parts.length === 0) return null;
  return parts.join(" • ");
}

export default async function DashboardPage() {
  // fail-soft defaults
  let upcomingSessionsCount = 0;
  let draftInvoicesCount = 0;
  let unsentEmailsCount = 0;
  let caseFilesCount = 0;

  let upcomingSessions: MediationSession[] = [];

  try {
    const auth = await requireAuthedSupabase();
    if (auth.ok) {
      const { supabase, userEmail } = auth;

      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      /**
       * 1) Upcoming sessions (future + not completed)
       * Truth: exclude sessions whose parent case is Closed.
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
          /**
           * IMPORTANT:
           * Use select("*") so we never fail due to unknown/missing optional columns.
           * This fixes the UUID-only display issue.
           */
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
              if (!st) return true; // fail-soft
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
       * 4) Case files count (reference)
       * This is not “open”; it’s just “case files”.
       */
      const { count: casesCount } = await supabase
        .from("cases")
        .select("id", { count: "exact", head: true })
        .eq("user_email", userEmail);

      caseFilesCount = Number(casesCount ?? 0);
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
    {
      label: "Case files",
      value: caseFilesCount,
      href: "/cases",
      hint: "Reference",
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
