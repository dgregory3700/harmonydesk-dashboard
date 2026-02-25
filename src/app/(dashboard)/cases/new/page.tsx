// src/app/(dashboard)/cases/new/page.tsx

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CaseStatus = "Active" | "Closed";

type MediationCase = {
  id: string;
  caseNumber: string;
  matter: string;
  parties: string;
  county: string;
  status: CaseStatus;
  nextSessionDate: string | null;
  notes: string | null;
  archivedAt?: string | null;
};

type County = {
  id: string;
  name: string;
  reportFormat: string;
  nextDueRule: string | null;
};

export default function NewCasePage() {
  const router = useRouter();

  const [caseNumber, setCaseNumber] = useState("");
  const [matter, setMatter] = useState("");
  const [parties, setParties] = useState("");

  // Counties from Settings
  const [counties, setCounties] = useState<County[]>([]);
  const [countiesLoading, setCountiesLoading] = useState(true);
  const [countiesError, setCountiesError] = useState<string | null>(null);
  const countiesById = useMemo(() => {
    const m = new Map<string, County>();
    for (const c of counties) m.set(c.id, c);
    return m;
  }, [counties]);

  // Selected county (store countyId in state, but submit county name)
  const [countyId, setCountyId] = useState<string>("");

  const [status, setStatus] = useState<CaseStatus>("Active");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCounties() {
      try {
        setCountiesLoading(true);
        setCountiesError(null);

        const res = await fetch("/api/counties", { method: "GET" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to load counties");
        }

        const data = (await res.json()) as County[];
        setCounties(data);

        // Default selection: first county, if any
        if (data.length > 0) {
          setCountyId((prev) => prev || data[0].id);
        }
      } catch (err: any) {
        console.error("Error loading counties:", err);
        setCountiesError(err?.message ?? "Failed to load counties");
      } finally {
        setCountiesLoading(false);
      }
    }

    loadCounties();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      // Basic front-end validation
      if (!caseNumber.trim() || !matter.trim() || !parties.trim()) {
        setError("Please fill in case number, matter, and parties.");
        setSubmitting(false);
        return;
      }

      if (!countyId) {
        setError("Please select a county.");
        setSubmitting(false);
        return;
      }

      const selectedCounty = countiesById.get(countyId);
      const countyName = selectedCounty?.name?.trim() || "";

      if (!countyName) {
        setError("Selected county is invalid. Please choose another.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseNumber: caseNumber.trim(),
          matter: matter.trim(),
          parties: parties.trim(),
          county: countyName,
          status,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to create case");
      }

      const created = (await res.json()) as MediationCase;

      // Go straight to the new case file
      router.push(`/cases/${created.id}`);
    } catch (err: any) {
      console.error("Error creating case:", err);
      setError(err?.message ?? "Failed to create case");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb / back link */}
      <div className="flex flex-col gap-1">
        <Link
          href="/cases"
          className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
        >
          ← Back to cases
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            New case
          </h1>
          <p className="text-sm text-slate-400">
            Create a new mediation file. Add sessions from the case file after
            creation.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
        {/* Left: core details */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-medium text-slate-200">Case details</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">
                  Case number *
                </label>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="HD-2025-004 or court case number"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">
                  County *
                </label>

                {countiesLoading ? (
                  <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-500">
                    Loading counties…
                  </div>
                ) : countiesError ? (
                  <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    {countiesError}
                  </div>
                ) : (
                  <select
                    value={countyId}
                    onChange={(e) => setCountyId(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    disabled={counties.length === 0}
                  >
                    {counties.length === 0 ? (
                      <option value="">No counties configured</option>
                    ) : (
                      counties.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                )}

                {!countiesLoading && !countiesError && counties.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    Add a county in Settings first, then come back here.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Matter / title *
              </label>
              <input
                type="text"
                value={matter}
                onChange={(e) => setMatter(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Smith vs. Turner – parenting plan"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Parties *
              </label>
              <input
                type="text"
                value={parties}
                onChange={(e) => setParties(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Alex Smith / Jamie Turner"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-200">Notes</h2>
              <span className="text-[11px] text-slate-500">
                Optional — you can update later on the case file.
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Background, agreements, safety concerns, or anything you want handy."
            />
          </div>
        </div>

        {/* Right: status + submit */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-medium text-slate-200">Status</h2>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Case status
              </label>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={status}
                onChange={(e) => setStatus(e.target.value as CaseStatus)}
              >
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                “Upcoming” is tracked on Sessions (Calendar), not as a case
                status.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <button
              type="submit"
              disabled={submitting || countiesLoading || counties.length === 0}
              className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Creating case…" : "Create case"}
            </button>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <p className="text-[11px] text-slate-500">
              After creating the case, you’ll be taken to its case file where you
              can add sessions and generate invoices.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
