import { RequireAuth } from "@/components/auth/RequireAuth";

const sampleCases = [
  {
    number: "23-2-00123-1",
    parties: "Smith vs. Turner",
    type: "Mediation",
    status: "Active",
    nextSession: "Dec 12, 2:00 PM",
    county: "King",
  },
  {
    number: "24-1-00456-5",
    parties: "Johnson / Lee",
    type: "Small Claims",
    status: "Draft",
    nextSession: "Dec 18, 10:00 AM",
    county: "Pierce",
  },
  {
    number: "23-3-00987-4",
    parties: "Rivera vs. Anderson",
    type: "Family",
    status: "Closed",
    nextSession: "—",
    county: "King",
  },
];

export default function CasesPage() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cases</h1>
            <p className="text-sm text-muted-foreground">
              Track active, draft, and closed matters in one place.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Your cases</h2>
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              New case (UI only)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2 py-2 font-medium">Case #</th>
                  <th className="px-2 py-2 font-medium">Parties</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Next session</th>
                  <th className="px-2 py-2 font-medium">County</th>
                </tr>
              </thead>
              <tbody>
                {sampleCases.map((c) => (
                  <tr key={c.number} className="border-b last:border-0">
                    <td className="px-2 py-2">{c.number}</td>
                    <td className="px-2 py-2">{c.parties}</td>
                    <td className="px-2 py-2">{c.type}</td>
                    <td className="px-2 py-2">{c.status}</td>
                    <td className="px-2 py-2">{c.nextSession}</td>
                    <td className="px-2 py-2">{c.county}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            These are sample cases to demonstrate the layout. Later we can hook
            this to a real <code>/api/cases</code> endpoint or Supabase table.
          </p>
        </div>
      </div>
    </RequireAuth>
  );
}
