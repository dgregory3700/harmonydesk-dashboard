export function TodayPanel({
  upcomingSessionsCount,
  newInquiriesCount,
  draftInvoicesCount,
}: {
  upcomingSessionsCount: number;
  newInquiriesCount: number;
  draftInvoicesCount: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-200">
        Today at a glance
      </h2>

      <p className="mb-3 text-[11px] text-slate-400">
        This panel is intentionally operational (no booking concepts). It shows
        only real, persisted signals.
      </p>

      <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-200">Upcoming sessions</p>
          <p className="text-xs text-slate-300">{upcomingSessionsCount}</p>
        </div>

        <div className="h-px bg-slate-800" />

        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-200">New inquiries</p>
          <p className="text-xs text-slate-300">{newInquiriesCount}</p>
        </div>

        <div className="h-px bg-slate-800" />

        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-200">Draft invoices</p>
          <p className="text-xs text-slate-300">{draftInvoicesCount}</p>
        </div>

        {upcomingSessionsCount === 0 &&
        newInquiriesCount === 0 &&
        draftInvoicesCount === 0 ? (
          <>
            <div className="h-px bg-slate-800" />
            <p className="text-[11px] text-slate-500">
              You&apos;re all caught up. As you add cases, sessions, and invoices,
              this panel will reflect real workload.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
