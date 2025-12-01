import { RequireAuth } from "@/components/auth/RequireAuth";

const sampleThreads = [
  {
    client: "Jeanne Potthoff",
    matter: "Jasper vs. stupid squirrels from next door",
    preview: "Thank you, I’ve attached the intake form…",
    updated: "Today · 9:14 AM",
    unread: 2,
  },
  {
    client: "Mr. Smith",
    matter: "Jim vs Jane",
    preview: "Got it, let’s confirm Friday at 1:30 PM.",
    updated: "Yesterday · 3:02 PM",
    unread: 0,
  },
];

export default function MessagesPage() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
            <p className="text-sm text-muted-foreground">
              Lightweight inbox for client communication. (UI only right now.)
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-medium mb-3">Recent threads</h2>

          <div className="space-y-2">
            {sampleThreads.map((t) => (
              <div
                key={t.matter}
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{t.client}</p>
                  <p className="text-xs text-muted-foreground">{t.matter}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.preview}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t.updated}</p>
                  {t.unread > 0 && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                      {t.unread} unread
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            In the production version, this can connect to email or an internal
            messaging system. For launch, it’s okay for this page to be a simple
            log of notes per case.
          </p>
        </div>
      </div>
    </RequireAuth>
  );
}
