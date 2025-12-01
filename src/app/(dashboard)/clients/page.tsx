import { RequireAuth } from "@/components/auth/RequireAuth";

const sampleClients = [
  {
    name: "Jeanne Potthoff",
    email: "jeanne@example.com",
    phone: "(206) 555-0182",
    nextSession: "Dec 12, 10:00 AM",
  },
  {
    name: "Mr. Smith",
    email: "mr.smith@example.com",
    phone: "(425) 555-0104",
    nextSession: "Dec 14, 1:30 PM",
  },
  {
    name: "Anderson / Rivera",
    email: "anderson.rivera@example.com",
    phone: "(253) 555-0199",
    nextSession: "Dec 20, 4:00 PM",
  },
];

export default function ClientsPage() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
            <p className="text-sm text-muted-foreground">
              One place for client contact details and upcoming sessions.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Client list</h2>
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              New client (UI only)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Phone</th>
                  <th className="px-2 py-2 font-medium">Next session</th>
                </tr>
              </thead>
              <tbody>
                {sampleClients.map((c) => (
                  <tr key={c.email} className="border-b last:border-0">
                    <td className="px-2 py-2">{c.name}</td>
                    <td className="px-2 py-2">{c.email}</td>
                    <td className="px-2 py-2">{c.phone}</td>
                    <td className="px-2 py-2">{c.nextSession}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Later, this table can sync with your real CRM or Supabase
            <code> clients </code> table. For launch, showing a clean list with
            basic info is already valuable.
          </p>
        </div>
      </div>
    </RequireAuth>
  );
}
