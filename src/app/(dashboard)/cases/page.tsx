"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type CaseStatus = "Open" | "Upcoming" | "Closed";

type MediationCase = {
  id: string;
  title: string;
  parties: string;
  county: string;
  type: string;
  status: CaseStatus;
  nextDate?: string; // ISO or plain text (e.g. "2025-12-03")
  notes?: string;
};

// Temporary in-memory data for the UI.
// Later we can swap this to load from Supabase (/api/cases).
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

export default function CasesPage() {
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "All">("All");
  const [search, setSearch] = useState("");

  const filteredCases = useMemo(() => {
    return INITIAL_CASES.filter((c) => {
      const matchesStatus =
        statusFilter === "All" ? true : c.status === statusFilter;

      const haystack = (
        c.id +
        " " +
        c.title +
        " " +
        c.parties +
        " " +
        c.county +
        " " +
        c.type
      ).toLowerCase();

      const matchesSearch = haystack.includes(search.toLowerCase().trim());

      return matchesStatus && matchesSearch;
    });
  }, [statusFilter, search]);

  const openCount = INITIAL_CASES.filter((c) => c.status === "Open").length;
  const upcomingCount = INITIAL_CASES.filter(
    (c) => c.status === "Upcoming"
  ).length;
  const closedCount = INITIAL_CASES.filter(
    (c) => c.status === "Closed"
  ).length;

  function formatDate(value?: string) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      // If it's not a real ISO date, just show the raw string
      return value;
    }
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cases</h1>
          <p className="text-sm text-muted-foreground">
            Track active mediations, upcoming sessions, and closed matters.
          </p>
        </div>

        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          + New case
        </button>
      </div>

      {/* Overview stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Open cases
          </p>
          <p className="mt-2 text-2xl font-semibold">{openCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Currently in progress.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Upcoming sessions
          </p>
          <p className="mt-2 text-2xl font-semibold">{upcomingCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sessions with a scheduled next date.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Closed matters
          </p>
          <p className="mt-2 text-2xl font-semibold">{closedCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Completed cases with signed agreements.
          </p>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Status:
          </span>

          <button
            type="button"
            onClick={() => setStatusFilter("All")}
            className={`rounded-full border px-3 py-1 text-xs ${
              statusFilter === "All"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("Open")}
            className={`rounded-full border px-3 py-1 text-xs ${
              statusFilter === "Open"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            Open
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("Upcoming")}
            className={`rounded-full border px-3 py-1 text-xs ${
              statusFilter === "Upcoming"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            Upcoming
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("Closed")}
            className={`rounded-full border px-3 py-1 text-xs ${
              statusFilter === "Closed"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            Closed
          </button>
        </div>

        <div className="w-full md:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case, parties, county…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Case list */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium">Case list</h2>

        {filteredCases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No cases match your filters. Try clearing the search or switching
            status tabs.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredCases.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border bg-background p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.id} • {c.parties}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.county} • {c.type}
                  </p>
                  {c.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {c.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-start gap-2 text-xs md:items-end">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        c.status === "Open"
                          ? "bg-amber-100 text-amber-800"
                          : c.status === "Upcoming"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {c.status}
                    </span>

                    <span className="text-muted-foreground">
                      Next date: {formatDate(c.nextDate)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/cases/${c.id}`}
                      className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent"
                    >
                      View case file
                    </Link>
                    <button
                      type="button"
                      className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent"
                    >
                      Create invoice
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
