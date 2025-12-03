"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

export default function CasesPage() {
  const [cases, setCases] = useState<MediationCase[]>([]);
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCases() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/cases");
        if (!res.ok) {
          throw new Error("Failed to load cases");
        }

        const data = (await res.json()) as MediationCase[];
        setCases(data);
      } catch (err: any) {
        console.error("Error loading cases:", err);
        setError(err?.message ?? "Failed to load cases");
      } finally {
        setLoading(false);
      }
    }

    loadCases();
  }, []);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesStatus =
        statusFilter === "All" ? true : c.status === statusFilter;

      const haystack = (
        c.caseNumber +
        " " +
        c.matter +
        " " +
        c.parties +
        " " +
        c.county
      ).toLowerCase();

      const matchesSearch = haystack.includes(search.toLowerCase().trim());

      return matchesStatus && matchesSearch;
    });
  }, [cases, statusFilter, search]);

  const openCount = cases.filter((c) => c.status === "Open").length;
  const upcomingCount = cases.filter((c) => c.status === "Upcoming").length;
  const closedCount = cases.filter((c) => c.status === "Closed").length;

  function formatDate(value?: string | null) {
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

        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          type="button"
          onClick={() => {
            alert("New case creation flow coming soon.");
          }}
        >
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

        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading cases…
          </p>
        ) : error ? (
          <p className="text-sm text-destructive">
            {error || "Something went wrong loading cases."}
          </p>
        ) : filteredCases.length === 0 ? (
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
                  <p className="text-sm font-medium">{c.matter}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.caseNumber} • {c.parties}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.county}
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
                      Next date: {formatDate(c.nextSessionDate)}
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
                      onClick={() =>
                        alert(
                          "In production this will create an invoice from this case."
                        )
                      }
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
