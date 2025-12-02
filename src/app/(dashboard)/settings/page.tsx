"use client";

import React, { useState } from "react";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("Harmony Desk Mediation");
  const [email] = useState("tired01@gmail.com"); // from auth in the future
  const [phone, setPhone] = useState("");

  const [homeCounty, setHomeCounty] = useState("King County");
  const [timeZone, setTimeZone] = useState("America/Los_Angeles");
  const [defaultSessionLength, setDefaultSessionLength] = useState("90");
  const [hourlyRate, setHourlyRate] = useState("250");

  const [notifyNewInquiry, setNotifyNewInquiry] = useState(true);
  const [notifyUpcomingSession, setNotifyUpcomingSession] = useState(true);
  const [notifyInvoiceSent, setNotifyInvoiceSent] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // In the future this will call an API.
    await new Promise((resolve) => setTimeout(resolve, 500));

    setSaving(false);
    setSavedAt(new Date());
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your workspace details, defaults, and notification
            preferences.
          </p>
        </div>

        {savedAt && (
          <p className="text-[11px] text-muted-foreground">
            Saved just now
          </p>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile */}
        <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Profile</h2>
            <p className="text-xs text-muted-foreground">
              These details appear on invoices and client-facing pages.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium mb-1">
                Practice / display name
              </label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium mb-1">
                Email (login)
              </label>
              <input
                className="w-full cursor-not-allowed rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-500"
                value={email}
                disabled
              />
              <p className="text-[11px] text-muted-foreground">
                Email changes will be managed from the sign-in provider
                later.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium mb-1">
                Phone (optional)
              </label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Practice defaults */}
        <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Practice defaults</h2>
            <p className="text-xs text-muted-foreground">
              These values are used when creating new cases, sessions,
              and invoices.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium mb-1">
                Home county
              </label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={homeCounty}
                onChange={(e) => setHomeCounty(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium mb-1">
                Time zone
              </label>
              <select
                className="w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
              >
                <option value="America/Los_Angeles">
                  Pacific (America/Los_Angeles)
                </option>
                <option value="America/Denver">
                  Mountain (America/Denver)
                </option>
                <option value="America/Chicago">
                  Central (America/Chicago)
                </option>
                <option value="America/New_York">
                  Eastern (America/New_York)
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium mb-1">
                Default session length (minutes)
              </label>
              <input
                type="number"
                min={30}
                step={15}
                className="w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={defaultSessionLength}
                onChange={(e) => setDefaultSessionLength(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium mb-1">
                Standard hourly rate (USD)
              </label>
              <div className="flex items-center gap-1">
                <span className="rounded-l-md border border-r-0 bg-slate-50 px-2 py-2 text-xs text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  className="w-full rounded-r-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Notifications</h2>
            <p className="text-xs text-muted-foreground">
              Email reminders for key events. In the future, we can add
              SMS as well.
            </p>
          </div>

          <div className="space-y-3">
            <ToggleRow
              label="New inquiry received"
              description="When someone fills out the booking or intake form."
              enabled={notifyNewInquiry}
              onChange={setNotifyNewInquiry}
            />
            <ToggleRow
              label="Upcoming session reminders"
              description="Reminder 24 hours before each scheduled mediation session."
              enabled={notifyUpcomingSession}
              onChange={setNotifyUpcomingSession}
            />
            <ToggleRow
              label="Invoice sent"
              description="Confirmation when an invoice email is sent to a client."
              enabled={notifyInvoiceSent}
              onChange={setNotifyInvoiceSent}
            />
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {/* Data & exports – future area */}
      <section className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
        <h2 className="text-sm font-semibold">Data & exports</h2>
        <p className="text-xs text-muted-foreground">
          CSV / PDF exports and workspace backups will live here. For now
          everything is handled directly from the billing and cases
          pages.
        </p>
      </section>
    </div>
  );
}

type ToggleRowProps = {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ label, description, enabled, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-left hover:bg-slate-50"
    >
      <div>
        <p className="text-xs font-medium text-slate-900">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <div
        className={`relative inline-flex h-5 w-9 items-center rounded-full border ${
          enabled ? "bg-sky-500 border-sky-500" : "bg-slate-200 border-slate-300"
        } transition-colors`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </div>
    </button>
  );
}
