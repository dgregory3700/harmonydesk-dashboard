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

  // Helper to color-code statuses dynamically
  const getStatusStyle = (status: string) => {
    if (status === "Confirmed") {
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    }
    if (status.includes("Pending")) {
      return "border-sky-500/20 bg-sky-500/10 text-sky-400";
    }
    return "border-slate-600 bg-slate-800 text-slate-400"; // Tentative/Other
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Upcoming sessions
        </h2>
        <span className="text-[11px] text-slate-400">
          Today + next few days
        </span>
      </div>

      <div className="space-y-3">
        {sessions.map((s) => (
          <div
            key={`${s.time}-${s.client}`}
            className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 hover:border-slate-700 transition-colors"
          >
            <div>
              <p className="text-xs font-medium text-slate-400">{s.time}</p>
              <p className="text-sm font-medium text-slate-200">{s.client}</p>
              <p className="text-[11px] text-slate-500">{s.type}</p>
            </div>
            <span
              className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusStyle(
                s.status
              )}`}
            >
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
