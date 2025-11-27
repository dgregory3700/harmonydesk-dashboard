import { RequireAuth } from "@/components/auth/RequireAuth";

export default function DashboardPage() {
  const stats = [
    { label: "Upcoming sessions", value: 5 },
    { label: "New inquiries", value: 3 },
    { label: "Messages to review", value: 4 },
    { label: "Booking rate (7d)", value: "62%" },
  ];

  return (
    <RequireAuth>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className="mt-2 text-xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </RequireAuth>
  );
}

