"use client";

import { useEffect, useState, FormEvent } from "react";

type UserSettings = {
  id: string | null;
  userEmail: string;
  fullName: string | null;
  phone: string | null;
  businessName: string | null;
  businessAddress: string | null;
  defaultHourlyRate: number | null;
  defaultCounty: string | null;
  defaultSessionDuration: number | null;
  timezone: string | null;
  darkMode: boolean;
};

type BillingStatus = {
  user_email: string;
  status: string; // "trialing" | "active" | "inactive" | "none"
  trial_end_at: string | null;
  current_period_end_at: string | null;
  enabled: boolean;
};

const TIMEZONE_OPTIONS = [
  { value: "America/Los_Angeles", label: "Pacific – America/Los_Angeles" },
  { value: "America/Denver", label: "Mountain – America/Denver" },
  { value: "America/Chicago", label: "Central – America/Chicago" },
  { value: "America/New_York", label: "Eastern – America/New_York" },
  { value: "America/Anchorage", label: "Alaska – America/Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii – Pacific/Honolulu" },
  { value: "UTC", label: "UTC" },
];

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Plan & Subscription
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Load existing settings from your Next API
  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch("/api/user-settings");
        if (!res.ok) throw new Error("Failed to load settings");

        const data = (await res.json()) as UserSettings;
        setSettings(data);
      } catch (err: any) {
        console.error("Error loading settings:", err);
        setLoadError(err?.message ?? "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Load billing status using email from settings
  useEffect(() => {
    async function fetchBilling() {
      // Wait for settings to load before fetching billing
      if (loading || !settings?.userEmail) {
        setBilling(null);
        setBillingLoading(false);
        return;
      }

      try {
        setBillingLoading(true);
        setBillingError(null);

        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "https://api.harmonydesk.ai";

        const res = await fetch(
          `${baseUrl}/api/billing/status?email=${encodeURIComponent(settings.userEmail)}`,
          { cache: "no-store" }
        );

        if (!res.ok) throw new Error("Failed to load plan status");
        const data = (await res.json()) as BillingStatus;
        setBilling(data);
      } catch (err: any) {
        console.error("Error loading billing status:", err);
        setBillingError(err?.message ?? "Failed to load plan status");
      } finally {
        setBillingLoading(false);
      }
    }

    fetchBilling();
  }, [loading, settings?.userEmail]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings || saving) return;

    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const res = await fetch("/api/user-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: settings.fullName,
          phone: settings.phone,
          businessName: settings.businessName,
          businessAddress: settings.businessAddress,
          defaultHourlyRate: settings.defaultHourlyRate,
          defaultCounty: settings.defaultCounty,
          defaultSessionDuration: settings.defaultSessionDuration,
          timezone: settings.timezone,
          darkMode: true, // Force Dark Mode
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to save settings");
      }

      const updated = (await res.json()) as UserSettings;
      setSettings(updated);
      setSaveSuccess(true);
    } catch (err: any) {
      console.error("Error saving settings:", err);
      setSaveError(err?.message ?? "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleManageSubscription() {
    if (!settings?.userEmail || portalLoading) return;

    try {
      setPortalLoading(true);
      setPortalError(null);

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "https://api.harmonydesk.ai";

      const res = await fetch(`${baseUrl}/api/stripe/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: settings.userEmail }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to open customer portal");
      }

      const data = (await res.json()) as { url: string };
      if (!data?.url) throw new Error("Portal URL missing");

      window.location.href = data.url;
    } catch (err: any) {
      console.error("Portal error:", err);
      setPortalError(err?.message ?? "Failed to open customer portal");
    } finally {
      setPortalLoading(false);
    }
  }

  function update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Settings
        </h1>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400">Loading settings…</p>
        </div>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Settings
        </h1>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-red-400">
            {loadError || "Failed to load settings."}
          </p>
        </div>
      </div>
    );
  }

  const timezoneIsKnown = settings.timezone
    ? TIMEZONE_OPTIONS.some((tz) => tz.value === settings.timezone)
    : false;

  const planLabel = (() => {
    if (!billing) return null;
    if (billing.status === "trialing") return "Trial";
    if (billing.status === "active") return "Active";
    if (billing.status === "none") return "Not subscribed";
    return "Inactive";
  })();

  const planPillClass = (() => {
    if (!billing) return "bg-slate-800 text-slate-200";
    if (billing.status === "trialing") return "bg-blue-900/40 text-blue-200";
    if (billing.status === "active") return "bg-emerald-900/40 text-emerald-200";
    return "bg-red-900/40 text-red-200";
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Settings
        </h1>
        <p className="text-sm text-slate-400">
          Configure your profile, business details, defaults, and subscription.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
        {/* Left: profile + business */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-medium text-slate-200">Profile</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">
                  Full name
                </label>
                <input
                  type="text"
                  value={settings.fullName ?? ""}
                  onChange={(e) => update("fullName", e.target.value || null)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">
                  Phone
                </label>
                <input
                  type="tel"
                  value={settings.phone ?? ""}
                  onChange={(e) => update("phone", e.target.value || null)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-medium text-slate-200">
              Business details
            </h2>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Business name
              </label>
              <input
                type="text"
                value={settings.businessName ?? ""}
                onChange={(e) =>
                  update("businessName", e.target.value || null)
                }
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Example: HarmonyDesk Mediation Services"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Business address
              </label>
              <textarea
                value={settings.businessAddress ?? ""}
                onChange={(e) =>
                  update("businessAddress", e.target.value || null)
                }
                rows={3}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder={"Street\nCity, State ZIP"}
              />
            </div>
          </div>
        </div>

        {/* Right: plan + defaults */}
        <div className="space-y-4">
          {/* Plan & Subscription */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-slate-200">
                Plan & Subscription
              </h2>

              {billingLoading ? (
                <span className="text-xs text-slate-400">Loading…</span>
              ) : planLabel ? (
                <span
                  className={`text-xs px-2 py-1 rounded-full border border-slate-700 ${planPillClass}`}
                >
                  {planLabel}
                </span>
              ) : null}
            </div>

            {billingError && (
              <p className="text-xs text-red-400">{billingError}</p>
            )}

            {!billingLoading && billing && settings && (
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Account</span>
                  <span className="font-medium">{settings.userEmail}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Access</span>
                  <span className="font-medium">
                    {billing.enabled ? "Enabled" : "Locked"}
                  </span>
                </div>

                {billing.status === "trialing" && billing.trial_end_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trial ends</span>
                    <span className="font-medium">
                      {formatDateTime(billing.trial_end_at)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={portalLoading || billingLoading}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900 disabled:opacity-60 transition-colors"
              >
                {portalLoading ? "Opening portal…" : "Manage subscription"}
              </button>

              {portalError && (
                <p className="mt-2 text-xs text-red-400">{portalError}</p>
              )}

              <p className="mt-2 text-[11px] text-slate-500">
                Manage your plan, payment method, invoices, or cancel in Stripe.
              </p>
            </div>
          </div>

          {/* Defaults */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-medium text-slate-200">Defaults</h2>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Default hourly rate
              </label>
              <input
                type="number"
                min={0}
                step={10}
                value={settings.defaultHourlyRate ?? ""}
                onChange={(e) =>
                  update(
                    "defaultHourlyRate",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="200"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Default county
              </label>
              <input
                type="text"
                value={settings.defaultCounty ?? ""}
                onChange={(e) =>
                  update("defaultCounty", e.target.value || null)
                }
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="King County"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Default session duration (hours)
              </label>
              <input
                type="number"
                min={0.25}
                step={0.25}
                value={settings.defaultSessionDuration ?? ""}
                onChange={(e) =>
                  update(
                    "defaultSessionDuration",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="1.0"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Timezone
              </label>
              <select
                value={settings.timezone ?? ""}
                onChange={(e) => update("timezone", e.target.value || null)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="">Select timezone…</option>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
                {settings.timezone && !timezoneIsKnown && (
                  <option value={settings.timezone}>
                    {settings.timezone} (custom)
                  </option>
                )}
              </select>
              <p className="text-[11px] text-slate-500">
                Used for session times, calendar views, and reminders.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>

          {saveError && <p className="text-xs text-red-400">{saveError}</p>}
          {saveSuccess && !saveError && (
            <p className="text-xs text-emerald-400">Settings saved.</p>
          )}
        </div>
      </form>
    </div>
  );
}
