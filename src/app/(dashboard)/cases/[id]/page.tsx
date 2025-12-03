"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type CaseStatus = "Open" | "Upcoming" | "Closed";

type MediationCase = {
  id: string;
  caseNumber: string;
  matter: string;
  parties: string;
  county: string;
  status: CaseStatus;
  nextSessionDate: string | null;
  notes: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadgeClasses(status: CaseStatus) {
  if (status === "Open") return "bg-amber-100 text-amber-800";
  if (status === "Upcoming") return "bg-blue-100 text-blue-800";
  return "bg-emerald-100 text-emerald-800";
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = (params?.id as string) || "";

  const [caseData, setCaseData] = useState<MediationCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [localStatus, setLocalStatus] = useState<CaseStatus>("Open");
  const [localNotes, setLocalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!caseId) return;

    async function loadCase() {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/cases/${caseId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Case not found");
          }
          throw new Error("Failed to load case");
        }

        const data = (await res.json()) as MediationCase;
        setCaseData(data);
        setLocalStatus(data.status);
        setLocalNotes(data.notes ?? "");
      } catch (err: any) {
        console.error("Error loading case:", err);
        setLoadError(err?.message ?? "Failed to load case");
      } finally {
        setLoading(false);
      }
    }

    loadCase();
  }, [caseId]);

  async function handleSave() {
    if (!caseId) return;
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: localStatus,
          notes: localNotes,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update case");
      }

      const updated = (await res.json()) as MediationCase;
      setCaseData(updated);
      setLocalStatus(updated.status);
      setLocalNotes(updated.notes ?? "");
      setSaveSuccess(true);
    } catch (err: any) {
      console.error("Error saving case:", err);
      setSaveError(err?.message ?? "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Link
          href="/cases"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to cases
        </Link>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Loading case…</p>
        </div>
      </div>
    );
  }

  if (loadError || !caseData) {
    return (
      <div className="space-y-4">
        <Link
          href="/cases"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to cases
        </Link>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-destructive">
            {loadError || "Case not found."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb / back link */}
      <div className="flex flex-col gap-1">
        <Link
          href="/cases"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to cases
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {caseData.matter}
            </h1>
            <p className="text-sm text-muted-foreground">
              Case ID: {caseData.caseNumber}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${statusBadgeClasses(
                localStatus
              )}`}
            >
              {localStatus}
            </span>
            <span className="text-muted-foreground">
              Next session: {formatDate(caseData.nextSessionDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Left column: case info & notes */}
        <div className="md:col-span-2 space-y-4">
          {/* Case info */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium mb-2">Case information</h2>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Parties</p>
                <p>{caseData.parties}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">County</p>
                <p>{caseData.county}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Matter</p>
                <p>{caseData.matter}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p>{localStatus}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium">Notes</h2>
              <span className="text-[11px] text-muted-foreground">
                Saved to this case when you click “Save changes”.
              </span>
            </div>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              rows={5}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this case, agreements reached, follow-up items…"
            />
          </div>

          {/* Session history placeholder */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium">Session history</h2>
              <span className="text-[11px] text-muted-foreground">
                We&apos;ll connect this to the calendar/sessions table next.
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              No sessions linked yet. Later, completed sessions from your
              calendar will appear here.
            </p>
          </div>
        </div>

        {/* Right column: actions */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium mb-3">Actions</h2>

            {/* Status selector */}
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              Case status
            </label>
            <select
              className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={localStatus}
              onChange={(e) => setLocalStatus(e.target.value as CaseStatus)}
            >
              <option value="Open">Open</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Closed">Closed</option>
            </select>

            <button
              type="button"
              className="mb-2 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            <button
              type="button"
              className="mt-1 w-full rounded-md border px-3 py-2 text-xs font-medium hover:bg-accent"
              onClick={() => {
                alert(
                  "In production, this will create an invoice linked to this case."
                );
              }}
            >
              Create invoice from this case
            </button>

            {saveError && (
              <p className="mt-2 text-xs text-destructive">{saveError}</p>
            )}
            {saveSuccess && !saveError && (
              <p className="mt-2 text-xs text-emerald-700">
                Changes saved.
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground shadow-sm">
            <p className="font-medium mb-1">What&apos;s next?</p>
            <p>
              Next we can connect session history from the calendar and wire
              the invoice button so it pre-fills a draft in your billing
              module.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
