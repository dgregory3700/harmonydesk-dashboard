"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";

type County = {
  id: string;
  name: string;
  reportFormat: "csv" | "pdf";
};

type UserSettings = {
  fullName: string | null;
  phone: string | null;
  businessName: string | null;
  businessAddress: string | null;
  defaultHourlyRate: number | null;
  defaultCounty: string | null; // legacy
  defaultCountyId: string | null; // new
  defaultSessionDuration: number | null;
  timezone: string | null;
  darkMode: boolean;
};

type Banner =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string }
  | null;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<Banner>(null);

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [counties, setCounties] = useState<County[]>([]);

  // General settings form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [defaultHourlyRate, setDefaultHourlyRate] = useState<string>("200");
  const [defaultSessionDuration, setDefaultSessionDuration] =
    useState<string>("1.0");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [darkMode, setDarkMode] = useState(false);

  // County settings
  const [defaultCountyId, setDefaultCountyId] = useState<string | null>(null);

  // Add county form
  const [newCountyName, setNewCountyName] = useState("");
  const [newCountyFormat, setNewCountyFormat] = useState<"csv" | "pdf">("csv");

  const countiesById = useMemo(() => {
    const m = new Map<string, County>();
    for (const c of counties) m.set(c.id, c);
    return m;
  }, [counties]);

  async function loadAll() {
    setLoading(true);
    setBanner(null);

    try {
      const [settingsRes, countiesRes] = await Promise.all([
        fetch("/api/user-settings", { method: "GET" }),
        fetch("/api/counties", { method: "GET" }),
      ]);

      if (!settingsRes.ok) {
        const body = await settingsRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load settings");
      }
      if (!countiesRes.ok) {
        const body = await countiesRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load counties");
      }

      const s = (await settingsRes.json()) as UserSettings;
      const c = (await countiesRes.json()) as County[];

      setSettings(s);
      setCounties(c);

      setFullName(s.fullName ?? "");
      setPhone(s.phone ?? "");
      setBusinessName(s.businessName ?? "");
      setBusinessAddress(s.businessAddress ?? "");
      setDefaultHourlyRate(
        s.defaultHourlyRate !== null && s.defaultHourlyRate !== undefined
          ? String(s.defaultHourlyRate)
          : "200"
      );
      setDefaultSessionDuration(
        s.defaultSessionDuration !== null && s.defaultSessionDuration !== undefined
          ? String(s.defaultSessionDuration)
          : "1.0"
      );
      setTimezone(s.timezone ?? "America/Los_Angeles");
      setDarkMode(!!s.darkMode);

      // Default county: use the new uuid field
      const initialDefaultCountyId =
        s.defaultCountyId ?? (c.length > 0 ? c[0].id : null);
      setDefaultCountyId(initialDefaultCountyId);
    } catch (err: any) {
      console.error(err);
      setBanner({
        kind: "error",
        text: err?.message ? String(err.message) : "Failed to load settings",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patchUserSettings(patch: Partial<UserSettings>) {
    const res = await fetch("/api/user-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(body.error || "Failed to save settings");
    }

    return body as UserSettings;
  }

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    try {
      const saved = await patchUserSettings({
        fullName: fullName.trim(),
        phone: phone.trim(),
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        defaultHourlyRate,
        defaultSessionDuration,
        timezone: timezone.trim(),
        darkMode,
      });

      setSettings(saved);
      setBanner({ kind: "success", text: "Settings saved." });
    } catch (err: any) {
      console.error(err);
      setBanner({
        kind: "error",
        text: err?.message ? String(err.message) : "Failed to save settings",
      });
    }
  }

  async function handleSetDefaultCounty(countyId: string | null) {
    setBanner(null);

    try {
      const saved = await patchUserSettings({
        defaultCountyId: countyId,
      });

      setSettings(saved);
      setDefaultCountyId(saved.defaultCountyId ?? null);
      setBanner({ kind: "success", text: "Default county updated." });
    } catch (err: any) {
      console.error(err);
      setBanner({
        kind: "error",
        text: err?.message ? String(err.message) : "Failed to update default county",
      });
    }
  }

  async function handleAddCounty(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    const name = newCountyName.trim();
    if (!name) return;

    try {
      const res = await fetch("/api/counties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, reportFormat: newCountyFormat }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to add county");

      // reload to ensure we have canonical list
      await loadAll();

      setNewCountyName("");
      setNewCountyFormat("csv");

      setBanner({ kind: "success", text: "County added." });
    } catch (err: any) {
      console.error(err);
      setBanner({
        kind: "error",
        text: err?.message ? String(err.message) : "Failed to add county",
      });
    }
  }

  async function handleDeleteCounty(countyId: string) {
    const county = countiesById.get(countyId);
    const ok = window.confirm(
      `Delete county "${county?.name ?? "this county"}"?\n\nThis should only be done if you’re sure no invoices rely on it.`
    );
    if (!ok) return;

    setBanner(null);

    try {
      const res = await fetch(`/api/counties/${encodeURIComponent(countyId)}`, {
        method: "DELETE",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to delete county");

      // If we deleted the default county, clear defaultCountyId
      if (defaultCountyId === countyId) {
        await handleSetDefaultCounty(null);
      }

      await loadAll();
      setBanner({ kind: "success", text: "County deleted." });
    } catch (err: any) {
      console.error(err);
      setBanner({
        kind: "error",
        text: err?.message ? String(err.message) : "Failed to delete county",
      });
    }
  }

  const defaultCountyLabel = defaultCountyId
    ? countiesById.get(defaultCountyId)?.name || "Unknown county"
    : "None";

  return (
    <div className="space-y-6">
      <DashboardGreeting />

      {banner && (
        <div
          className={[
            "rounded-xl border p-4",
            banner.kind === "success"
              ? "border-emerald-800 bg-emerald-900/20"
              : "border-red-800 bg-red-900/20",
          ].join(" ")}
        >
          <p
            className={[
              "text-sm font-medium",
              banner.kind === "success" ? "text-emerald-200" : "text-red-200",
            ].join(" ")}
          >
            {banner.kind === "success" ? "Success" : "Error"}
          </p>
          <p
            className={[
              "mt-1 text-sm",
              banner.kind === "success"
                ? "text-emerald-100/90"
                : "text-red-100/90",
            ].join(" ")}
          >
            {banner.text}
          </p>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {/* GENERAL SETTINGS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <h1 className="text-lg font-semibold text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage defaults and operational preferences.
        </p>

        <form onSubmit={handleSaveGeneral} className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Full name
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Phone
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Business name
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Mediation Practice LLC"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Business address
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Street, City, State"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Default hourly rate
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={defaultHourlyRate}
                onChange={(e) => setDefaultHourlyRate(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Default session duration (hours)
              </label>
              <input
                type="number"
                min="0"
                step="0.25"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={defaultSessionDuration}
                onChange={(e) => setDefaultSessionDuration(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Timezone
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/Los_Angeles"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                id="darkMode"
                type="checkbox"
                className="h-4 w-4"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              <label
                htmlFor="darkMode"
                className="text-sm text-slate-200"
              >
                Dark mode
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => loadAll()}
              className="rounded-md border border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900"
            >
              Reload
            </button>
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Save settings
            </button>
          </div>
        </form>
      </div>

      {/* COUNTY SETTINGS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold text-slate-200">
          County reporting
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Counties drive deterministic exports and invoice binding. Default county
          auto-applies to new invoices (Billing page behavior).
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Default county */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-xs font-medium text-slate-300">Default county</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Current: <span className="text-slate-200">{defaultCountyLabel}</span>
            </p>

            <div className="mt-3 flex items-center gap-2">
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                value={defaultCountyId ?? ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setDefaultCountyId(v);
                }}
                disabled={counties.length === 0}
              >
                {counties.length === 0 ? (
                  <option value="">No counties configured</option>
                ) : (
                  <>
                    <option value="">None</option>
                    {counties.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.reportFormat.toUpperCase()})
                      </option>
                    ))}
                  </>
                )}
              </select>

              <button
                type="button"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60"
                disabled={counties.length === 0 && !defaultCountyId}
                onClick={() => handleSetDefaultCounty(defaultCountyId)}
              >
                Save
              </button>
            </div>
          </div>

          {/* Add county */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-xs font-medium text-slate-300">Add county</p>

            <form onSubmit={handleAddCounty} className="mt-3 space-y-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">
                  County name
                </label>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  value={newCountyName}
                  onChange={(e) => setNewCountyName(e.target.value)}
                  placeholder="e.g. King County"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">
                  Report format
                </label>
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                  value={newCountyFormat}
                  onChange={(e) =>
                    setNewCountyFormat(e.target.value as "csv" | "pdf")
                  }
                >
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              <button
                type="submit"
                className="rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500"
              >
                Add county
              </button>
            </form>
          </div>
        </div>

        {/* County list */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-300">Counties</p>
            <p className="text-[11px] text-slate-500">
              {counties.length} configured
            </p>
          </div>

          {counties.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No counties yet. Add one above.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {counties.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Format: {c.reportFormat.toUpperCase()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteCounty(c.id)}
                    className="rounded-md border border-slate-700 bg-transparent px-3 py-1 text-xs font-medium text-red-400 hover:border-red-800 hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-[11px] text-slate-500">
            Note: If you delete a county that invoices still reference, exports or
            UI may show “Unknown county”. Prefer deleting only unused counties.
          </p>
        </div>
      </div>
    </div>
  );
}
