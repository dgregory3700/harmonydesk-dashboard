// src/app/(dashboard)/messages/new/MessagesNewClient.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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

type Message = {
  id: string;
  caseId: string | null;
  subject: string;
  body: string;
  createdAt: string;
};

function buildSubjectForCase(c: MediationCase): string {
  if (c.matter && c.caseNumber) {
    return `Notes for ${c.matter} (${c.caseNumber})`;
  }
  if (c.matter) {
    return `Notes for ${c.matter}`;
  }
  if (c.caseNumber) {
    return `Notes for case ${c.caseNumber}`;
  }
  return "Case notes";
}

export default function MessagesNewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCaseId = searchParams.get("caseId");

  const [cases, setCases] = useState<MediationCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);

  const [caseId, setCaseId] = useState<string | "">(preselectedCaseId || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Track if the user has manually edited these fields,
  // so we don't overwrite their typing when auto-filling.
  const [subjectDirty, setSubjectDirty] = useState(false);
  const [bodyDirty, setBodyDirty] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCases() {
      try {
        setLoadingCases(true);
        setCasesError(null);

        const res = await fetch("/api/cases");
        if (!res.ok) {
          throw new Error("Failed to load cases");
        }

        const data = (await res.json()) as MediationCase[];
        setCases(data);
      } catch (err: any) {
        console.error("Error loading cases for messages:", err);
        setCasesError(err?.message ?? "Failed to load cases");
      } finally {
        setLoadingCases(false);
      }
    }

    loadCases();
  }, []);

  // Option C1, C3, C4:
  // Auto-fill subject and body based on selected case,
  // but only if the user hasn't started typing yet (not "dirty").
  useEffect(() => {
    if (!caseId) return;
    if (!cases || cases.length === 0) return;

    const selected = cases.find((c) => c.id === caseId);
    if (!selected) return;

    // Subject auto-fill: only if user hasn't edited and subject is empty.
    if (!subjectDirty && subject.trim() === "") {
      setSubject(buildSubjectForCase(selected));
    }

    // Body auto-fill: only if user hasn't edited and body is empty,
    // and the case has notes we can use as a starting point.
    if (
      !bodyDirty &&
      body.trim() === "" &&
      selected.notes &&
      selected.notes.trim() !== ""
    ) {
      setBody(selected.notes);
    }
  }, [caseId, cases, subject, subjectDirty, body, bodyDirty]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      if (!subject.trim() || !body.trim()) {
        setError("Subject and message body are required.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          caseId: caseId || null,
        }),
      });

      if (!res.ok) {
        const bodyJson = await res.json().catch(() => ({}));
        throw new Error(bodyJson?.error || "Failed to create message");
      }

      const created = (await res.json()) as Message;

      router.push(`/messages/${created.id}`);
    } catch (err: any) {
      console.error("Error creating message:", err);
      setError(err?.message ?? "Failed to create message");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-col gap-1">
        <Link
          href="/messages"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to messages
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            New message
          </h1>
          <p className="text-sm text-muted-foreground">
            Add an internal note or message, optionally linked to a case.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 md:grid-cols-3"
      >
        {/* Left: message content */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (!subjectDirty) setSubjectDirty(true);
                }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Example: Prep notes for Johnson / Lee mediation"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">
                Message *
              </label>
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (!bodyDirty) setBodyDirty(true);
                }}
                rows={8}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Internal note, safety concerns, what to cover in the next session, etc."
              />
            </div>
          </div>
        </div>

        {/* Right: case link & actions */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">
                Link to case (optional)
              </label>
              {loadingCases ? (
                <p className="text-xs text-muted-foreground">
                  Loading cases…
                </p>
              ) : casesError ? (
                <p className="text-xs text-destructive">{casesError}</p>
              ) : (
                <select
                  value={caseId}
                  onChange={(e) => {
                    setCaseId(e.target.value);
                    // We intentionally do NOT reset subject/body or dirty flags here.
                    // The effect above will auto-fill if fields are still clean.
                  }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No case linked</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.matter} ({c.caseNumber})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save message"}
            </button>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <p className="text-[11px] text-muted-foreground">
              Messages are private to you for now. Later we can sync them
              with email history.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
