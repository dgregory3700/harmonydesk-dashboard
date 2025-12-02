"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type CaseStatus = "Open" | "Upcoming" | "Closed";

type MediationCase = {
  id: string;
  title: string;
  parties: string;
  county: string;
  type: string;
  status: CaseStatus;
  nextDate?: string;
  notes?: string;
};

// Same temporary dataset as the list page.
// Later we'll replace this with a real fetch from Supabase.
const INITIAL_CASES: MediationCase[] = [
  {
    id: "HD-2025-001",
    title: "Smith vs. Turner – parenting plan",
    parties: "Alex Smith / Jamie Turner",
    county: "King County",
    type: "Family mediation",
    status: "Upcoming",
    nextDate: "2025-12-05",
    notes: "Parenting plan revision; high conflict, needs extra buffer time.",
  },
  {
    id: "HD-2025-002",
    title: "Johnson vs. Lee – small claims",
    parties: "Taylor Johnson / Morgan Lee",
    county: "Pierce County",
    type: "Small claims",
    status: "Open",
    nextDate: "2025-12-10",
    notes: "Dispute over contractor invoice; discovery in progress.",
  },
  {
    id: "HD-2025-003",
    title: "Miller vs. Rivera – neighbor dispute",
    parties: "Chris Miller / Ana Rivera",
    county: "King County",
    type: "Civil mediation",
    status: "Closed",
    nextDate: undefined,
    notes: "Settled; follow-up email sent with agreement PDF.",
  },
  {
    id: "HD-2025-004",
    title: "Acme Corp vs. Vendor – contract renegotiation",
    parties: "Acme Corp / Vendor LLC",
    county: "Snohomish County",
    type: "Commercial",
    status: "Open",
    nextDate: "2025-12-15",
  },
];

function formatDate(value?: string) {
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

  const caseData = useMemo(
    () => INITIAL_CASES.find((c) => c.id === caseId),
    [caseId]
  );

  const [localNotes, setLocalNotes] = useState<string>(
    caseData?.notes ?? ""
  );

  if (!caseData) {
    return (
      <div className="space-y-4">
        <Link
          href="/cases"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to cases
        </Link>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Case not found. It may have been removed or the ID is incorrect.
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
              {caseData.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Case ID: {caseData.id}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${statusBadgeClasses(
                caseData.status
              )}`}
            >
              {caseData.status}
            </span>
            <span className="text-muted-foreground">
              Next session: {formatDate(caseData.nextDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Left column: case info */}
        <div className="md:col-span-2 space-y-4">
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
                <p className="text-xs text-muted-foreground">Matter type</p>
                <p>{caseData.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Current status
                </p>
                <p>{caseData.status}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium">Notes</h2>
              <span className="text-[11px] text-muted-foreground">
                (Local only for now – will be saved to Supabase later)
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

          {/* Session history (placeholder) */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium">Session history</h2>
              <span className="text-[11px] text-muted-foreground">
                (We’ll connect this to the calendar/sessions table next.)
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
            <button
              type="button"
              className="mb-2 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
              onClick={() => {
                // Later this will navigate to /invoices/new?caseId=...
                alert(
                  "In production, this will create an invoice linked to this case."
                );
              }}
            >
              Create invoice from this case
            </button>

            <button
              type="button"
              className="mt-1 w-full rounded-md border px-3 py-2 text-xs font-medium hover:bg-accent"
            >
              Update status (coming soon)
            </button>
          </div>

          <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground shadow-sm">
            <p className="font-medium mb-1">What&apos;s next?</p>
            <p>
              Once we connect this page to Supabase, you&apos;ll be able to
              update status, attach sessions, and auto-generate invoices
              based on this case.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
