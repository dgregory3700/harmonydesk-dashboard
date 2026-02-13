"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [cases, setCases] = useState<MediationCase[]>([]);
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceCreateError, setInvoiceCreateError] = useState<string | null>(null);

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

  async function handleCreateInvoice(c: MediationCase) {
    try {
      setInvoiceCreateError(null);
      
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseNumber: c.caseNumber,
          matter: c.matter,
          contact: c.parties,
          hours: 0,
          rate: 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invoice");
      }

      router.push("/billing");
    } catch (err: any) {
      console.error("Error creating invoice:", err);
      setInvoiceCreateError(err?.message ?? "Failed to create invoice");
    }
  }

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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Cases
          </h1>
          <p className="text-sm text-slate-400">
            Track active mediations, upcoming sessions, and closed matters.
          </p>
        </div>

        <Link
          href="/cases/new"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
        >
          + New case
        </Link>
      </div>

      {/* Overview stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Open cases</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {openCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Currently in progress.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">
            Upcoming sessions
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {upcomingCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Sessions with a scheduled next date.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Closed matters</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {closedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Completed cases with signed agreements.
          </p>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Status:</span>

          {["All", "Open", "Upcoming", "Closed"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status as any)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                statusFilter === status
                  ? "border-sky-500/50 bg-sky-500/10 text-sky-400"
                  : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case, parties, county…"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
      </div>

      {/* Case list */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-slate-300">Case list</h2>

        {invoiceCreateError && (
          <div className="mb-3 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {invoiceCreateError}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading cases…</p>
        ) : error ? (
          <p className="text-sm text-red-400">
            {error || "Something went wrong loading cases."}
          </p>
        ) : filteredCases.length === 0 ? (
          <p className="text-sm text-slate-500">
            No cases match your filters. Try clearing the search or switching
            status tabs.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredCases.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 md:flex-row md:items-center md:justify-between hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">
                    {c.matter}
                  </p>
                  <p className="text-xs text-slate-400">
                    {c.caseNumber} • {c.parties}
                  </p>
                  <p className="text-xs text-slate-500">{c.county}</p>
                  {c.notes && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {c.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-start gap-2 text-xs md:items-end">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                        c.status === "Open"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                          : c.status === "Upcoming"
                          ? "border-sky-500/20 bg-sky-500/10 text-sky-400"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {c.status}
                    </span>

                    <span className="text-slate-500">
                      Next date: {formatDate(c.nextSessionDate)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/cases/${c.id}`}
                      className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      View case file
                    </Link>
                    <button
                      type="button"
                      className="rounded-md border border-slate-700 bg-transparent px-3 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                      onClick={() => handleCreateInvoice(c)}
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
