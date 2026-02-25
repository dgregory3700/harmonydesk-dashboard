import Link from "next/link";

type MediationSession = {
  id: string;
  caseId: string;
  date: string; // ISO
  completed: boolean;
  durationHours?: number;
  notes?: string | null;
  caseLabel?: string; // may be absent
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

function shortNotes(notes?: string | null) {
  if (!notes) return null;
  const s = String(notes).trim();
  if (!s) return null;
  // keep it short and non-noisy
  return s.length > 70 ? s.slice(0, 70) + "…" : s;
}

export function SessionsOverview({ sessions }: { sessions: MediationSession[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">
          Upcoming sessions
        </h2>

        <Link
          href="/calendar"
          className="text-[11px] text-slate-400 hover:text-slate-200"
        >
          Open calendar →
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-sm text-slate-300">No upcoming sessions yet.</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Add a session to a case to see it here.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/cases"
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              Go to Cases
            </Link>
            <Link
              href="/calendar"
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              Go to Calendar
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950">
          <ul className="divide-y divide-slate-800">
            {sessions.map((s) => {
              const notes = shortNotes(s.notes);
              return (
                <li key={s.id} className="px-4 py-3">
                  <Link
                    href={`/calendar/${s.id}`}
                    className="block rounded-lg -m-1 p-2 hover:bg-slate-900/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">
                          {formatWhen(s.date)}
                          {typeof s.durationHours === "number" &&
                          Number.isFinite(s.durationHours) &&
                          s.durationHours > 0 ? (
                            <span className="text-slate-500">
                              {" "}
                              • {s.durationHours}h
                            </span>
                          ) : null}
                        </p>

                        {notes ? (
                          <p className="mt-1 text-[11px] text-slate-500 truncate">
                            {notes}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-slate-600 truncate">
                            Click to view session
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300">
                        Upcoming
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
