type MediationSession = {
  id: string;
  caseId: string;
  date: string; // ISO
  completed: boolean;
  durationHours?: number;
  notes?: string | null;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SessionsOverview({ sessions }: { sessions: MediationSession[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">
          Upcoming sessions
        </h2>
        <span className="text-[11px] text-slate-400">Next scheduled</span>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-sm text-slate-300">No upcoming sessions yet.</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Create a case and add sessions to see them here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950">
          <ul className="divide-y divide-slate-800">
            {sessions.map((s) => (
              <li key={s.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {formatWhen(s.date)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 truncate">
                      Case: <span className="text-slate-400">{s.caseId}</span>
                      {typeof s.durationHours === "number" &&
                      Number.isFinite(s.durationHours) &&
                      s.durationHours > 0 ? (
                        <>
                          {" "}
                          • {s.durationHours}h
                        </>
                      ) : null}
                      {s.notes ? <> • {s.notes}</> : null}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300">
                    Upcoming
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
