// src/components/dashboard/SessionsOverview.tsx
export function SessionsOverview() {
  const sessions = [
    {
      time: "10:00 AM",
      client: "Smith vs. Turner",
      type: "Mediation session",
      status: "Confirmed",
    },
    {
      time: "1:30 PM",
      client: "Johnson / Lee",
      type: "Intro consult",
      status: "Pending intake form",
    },
    {
      time: "4:00 PM",
      client: "Anderson / Rivera",
      type: "Follow-up session",
      status: "Tentative",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-100">
          Upcoming sessions
        </h2>
        <span className="text-[11px] text-slate-500">
          Today + next few days
        </span>
      </div>

      <div className="space-y-3">
        {sessions.map((s) => (
          <div
            key={`${s.time}-${s.client}`}
            className="flex items-start justify-between gap-3 rounded-xl border border-slate-800/60 bg-slate-900/80 px-3 py-2"
          >
            <div>
              <p className="text-xs font-medium text-slate-300">{s.time}</p>
              <p className="text-sm text-slate-50">{s.client}</p>
              <p className="text-[11px] text-slate-400">{s.type}</p>
            </div>
            <span className="mt-1 inline-flex items-center rounded-full border border-emerald-600/50 bg-emerald-600/10 px-2 py-0.5 text-[10px] text-emerald-300">
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
