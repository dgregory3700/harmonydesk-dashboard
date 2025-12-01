import { RequireAuth } from "@/components/auth/RequireAuth";

const exampleLink = "https://harmonydesk.ai/book/tired01";

export default function BookingLinksPage() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Booking links
            </h1>
            <p className="text-sm text-muted-foreground">
              Share simple links so clients can book time on your calendar.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-medium mb-1">Default booking link</h2>
            <p className="text-xs text-muted-foreground mb-2">
              This is the link you’ll paste into emails, your website, or text
              messages. For now it’s just a sample URL.
            </p>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <code className="flex-1 rounded-md border bg-background px-3 py-2 text-xs break-all">
                {exampleLink}
              </code>
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                Copy link (UI only)
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Coming soon
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
              <li>Different links for mediation vs. intro consults</li>
              <li>Automatic syncing with your Google Calendar availability</li>
              <li>Ability to embed a booking form on your website</li>
            </ul>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
