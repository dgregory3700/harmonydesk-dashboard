// src/components/dashboard/TodayPanel.tsx

export function TodayPanel() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-semibold text-slate-200 mb-3">
        Today at a glance
      </h2>
      <p className="text-[11px] text-slate-400 mb-3">
        This section will later sync with your calendar. For now, it&apos;s a
        quick checklist.
      </p>

      <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-3">
        <p className="text-xs font-medium text-slate-200">
          You&apos;re all caught up.
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          As you add cases, sessions, messages, and invoices, we&apos;ll surface
          action items here.
        </p>
      </div>
    </div>
  );
}
