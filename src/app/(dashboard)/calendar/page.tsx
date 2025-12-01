import { RequireAuth } from "@/components/auth/RequireAuth";

const mockWeek = [
  { day: "Mon", date: "Dec 1", sessions: 2 },
  { day: "Tue", date: "Dec 2", sessions: 1 },
  { day: "Wed", date: "Dec 3", sessions: 3 },
  { day: "Thu", date: "Dec 4", sessions: 0 },
  { day: "Fri", date: "Dec 5", sessions: 2 },
  { day: "Sat", date: "Dec 6", sessions: 0 },
  { day: "Sun", date: "Dec 7", sessions: 0 },
];

export default function CalendarPage() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
            <p className="text-sm text-muted-foreground">
              See your mediation schedule at a glance. (Sample data for now —
              ready to connect to Google Calendar.)
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-medium mb-3">This week</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
            {mockWeek.map((day) => (
              <div
                key={day.day}
                className="rounded-lg border bg-background px-3 py-2 text-center"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {day.day}
                </p>
                <p className="text-sm font-semibold">{day.date}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {day.sessions === 0
                    ? "No sessions"
                    : `${day.sessions} session${day.sessions > 1 ? "s" : ""}`}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            When we wire up Google Calendar, this view will show your real
            sessions, gaps, and next available time.
          </p>
        </div>
      </div>
    </RequireAuth>
  );
}
