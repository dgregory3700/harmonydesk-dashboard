// src/components/dashboard/SessionsOverview.tsx

export function SessionsOverview() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Upcoming sessions
        </h2>
        <span className="text-[11px] text-slate-400">Today + next few days</span>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-sm text-slate-300">No upcoming sessions yet.</p>
        <p className="mt-1 text-[11px] text-slate-500">
          Create a case and add sessions to see them here.
        </p>
      </div>
    </div>
  );
}
