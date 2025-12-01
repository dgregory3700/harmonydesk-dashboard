import { RequireAuth } from "@/components/auth/RequireAuth";

export default function SettingsPage() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Account details, preferences, and integrations.
          </p>
        </div>

        {/* Account */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-medium">Account</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Display name
              </p>
              <p className="text-sm">HarmonyDesk mediator</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Login email
              </p>
              <p className="text-sm">tired01@gmail.com</p>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-medium">Calendar integration</h2>
          <p className="text-xs text-muted-foreground">
            HarmonyDesk uses a service account to read your Google Calendar for
            availability and sessions.
          </p>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Status
              </p>
              <p className="text-sm">Connected (service account)</p>
            </div>
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground cursor-not-allowed"
            >
              Disconnect (coming soon)
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-medium">Notifications</h2>
          <p className="text-xs text-muted-foreground">
            Email reminders and summaries. These are placeholder toggles for
            now.
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" defaultChecked disabled className="h-3 w-3" />
              Email reminders for upcoming sessions
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" defaultChecked disabled className="h-3 w-3" />
              Daily summary email
            </label>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
