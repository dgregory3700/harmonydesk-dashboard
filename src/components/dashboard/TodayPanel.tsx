import Link from "next/link";

type TodayPanelProps = {
  upcomingSessionsCount?: number;
  completedSessionsCount?: number;
  draftInvoicesCount?: number;
  unsentEmailsCount?: number;
};

/**
 * Quick Actions panel.
 * Props are optional to keep the dashboard build stable even if the page
 * renders <TodayPanel /> without counts (or older versions still pass counts).
 */
export function TodayPanel(_props: TodayPanelProps = {}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-200">
        Quick actions
      </h2>

      <p className="mb-3 text-[11px] text-slate-400">
        Shortcuts to the real work. No booking language. No duplicated stats.
      </p>

      <div className="space-y-2">
        <Link
          href="/calendar"
          className="block rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 hover:bg-slate-900/40"
        >
          <p className="text-xs font-medium text-slate-200">Calendar</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Review upcoming sessions and mark completion.
          </p>
        </Link>

        <Link
          href="/billing"
          className="block rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 hover:bg-slate-900/40"
        >
          <p className="text-xs font-medium text-slate-200">Billing</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Prepare drafts and send invoices.
          </p>
        </Link>

        <Link
          href="/messages"
          className="block rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 hover:bg-slate-900/40"
        >
          <p className="text-xs font-medium text-slate-200">Messages</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Send emails and review delivery.
          </p>
        </Link>

        <Link
          href="/cases"
          className="block rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 hover:bg-slate-900/40"
        >
          <p className="text-xs font-medium text-slate-200">
            Case files (reference)
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            View the case record connected to your sessions.
          </p>
        </Link>
      </div>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
        <p className="text-[11px] text-slate-500">
          Tip: Your schedule is driven by <code>sessions</code>. If the dashboard
          looks empty after creating a case, confirm you added a session record.
        </p>
      </div>
    </div>
  );
}
