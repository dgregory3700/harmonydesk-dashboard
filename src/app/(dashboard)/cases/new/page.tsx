"use client";

import { FormEvent, useState } from "react";
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

export default function NewCasePage() {
  const router = useRouter();

  const [caseNumber, setCaseNumber] = useState("");
  const [matter, setMatter] = useState("");
  const [parties, setParties] = useState("");
  const [county, setCounty] = useState("");
  const [status, setStatus] = useState<CaseStatus>("Open");
  const [nextSessionDate, setNextSessionDate] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      // Basic front-end validation
      if (
        !caseNumber.trim() ||
        !matter.trim() ||
        !parties.trim() ||
        !county.trim()
      ) {
        setError("Please fill in case number, matter, parties, and county.");
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
          county: county.trim(),
          status,
          nextSessionDate: nextSessionDate.trim() || null,
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
            Create a new mediation file with case details and first session
            info.
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
                <input
                  type="text"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="King County"
                />
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

        {/* Right: status & first session */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-medium text-slate-200">
              Status & schedule
            </h2>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Case status
              </label>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={status}
                onChange={(e) => setStatus(e.target.value as CaseStatus)}
              >
                <option value="Open">Open</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Next session date
              </label>
              <input
                type="date"
                value={nextSessionDate}
                onChange={(e) => setNextSessionDate(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Creating case…" : "Create case"}
            </button>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <p className="text-[11px] text-slate-500">
              After creating the case, you&apos;ll be taken straight to its case
              file, where you can add sessions and generate invoices.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
