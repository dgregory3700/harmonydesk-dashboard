import { headers } from "next/headers";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { SessionsOverview } from "@/components/dashboard/SessionsOverview";
import { TodayPanel } from "@/components/dashboard/TodayPanel";

export const dynamic = "force-dynamic";

type MediationSession = {
  id: string;
  caseId: string;
  date: string; // ISO
  completed: boolean;
  durationHours?: number;
  notes?: string | null;
};

type MediationCase = {
  id: string;
  status?: string | null;
  parties?: string | null;
  matter?: string | null;
};

type InvoiceStatus = "Draft" | "Sent" | "For county report";

type Invoice = {
  id: string;
  status: InvoiceStatus;
  due?: string;
  caseNumber?: string;
  matter?: string;
  contact?: string;
};

function getBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return "";
  return `${proto}://${host}`;
}

async function safeJson<T>(res: Response): Promise<T> {
  // If the API returns empty body for any reason, avoid throwing
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
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
    const baseUrl = getBaseUrl();

    const [sessionsRes, casesRes, invoicesRes] = await Promise.all([
      fetch(`${baseUrl}/api/sessions`, { cache: "no-store" }),
      fetch(`${baseUrl}/api/cases`, { cache: "no-store" }),
      fetch(`${baseUrl}/api/invoices`, { cache: "no-store" }),
    ]);

    const nowMs = Date.now();

    // Sessions → Upcoming sessions (future + not completed), date-safe
    if (sessionsRes.ok) {
      const sessions = (await safeJson<MediationSession[]>(sessionsRes)) ?? [];

      const futureNotCompleted = sessions
        .filter((s) => {
          const notCompleted = !s.completed;
          const ms = parseMillis(s.date);
          const hasFutureDate = ms !== null && ms > nowMs;
          return notCompleted && hasFutureDate;
        })
        .sort((a, b) => {
          const am = parseMillis(a.date) ?? 0;
          const bm = parseMillis(b.date) ?? 0;
          return am - bm;
        });

      upcomingSessions = futureNotCompleted.slice(0, 6);
      upcomingSessionsCount = futureNotCompleted.length;
    }

    // Cases → New inquiries
    if (casesRes.ok) {
      const cases = (await safeJson<MediationCase[]>(casesRes)) ?? [];

      /**
       * Truth rule (documented):
       * We treat cases with status === "Open" as "New inquiries".
       * This matches current workflow semantics: newly created / active intake lives in Open.
       */
      newInquiriesCount = cases.filter((c) => c.status === "Open").length;
    }

    // Invoices → Draft invoices
    if (invoicesRes.ok) {
      const invoices = (await safeJson<Invoice[]>(invoicesRes)) ?? [];
      draftInvoicesCount = invoices.filter((i) => i.status === "Draft").length;
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
