// src/app/(dashboard)/messages/new/MessagesNewClient.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type CaseStatus = "Open" | "Upcoming" | "Closed";
type MessageDirection = "internal" | "email_outbound";

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
  // Optional future fields; not required for redirect
  direction?: MessageDirection;
  to_emails?: string | null;
  from_email?: string | null;
  sent_at?: string | null;
  email_status?: "pending" | "sent" | "failed" | null;
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

// Very simple email validation for UX (not bulletproof, just sanity check)
function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  // basic pattern: something@something.something
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
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

  // Email integration controls
  const [alsoSendAsEmail, setAlsoSendAsEmail] = useState(false);
  const [toEmails, setToEmails] = useState("");
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);

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
      setEmailFieldError(null);

      if (!subject.trim() || !body.trim()) {
        setError("Subject and message body are required.");
        setSubmitting(false);
        return;
      }

      let parsedToEmails: string[] = [];

      if (alsoSendAsEmail) {
        if (!toEmails.trim()) {
          setEmailFieldError(
            "Please enter at least one recipient email address."
          );
          setSubmitting(false);
          return;
        }

        parsedToEmails = toEmails
          .split(/[,\s]+/)
          .map((v) => v.trim())
          .filter((v) => v.length > 0);

        if (parsedToEmails.length === 0) {
          setEmailFieldError(
            "Please enter at least one valid email address."
          );
          setSubmitting(false);
          return;
        }

        const invalid = parsedToEmails.find((addr) => !isValidEmail(addr));
        if (invalid) {
          setEmailFieldError(
            `This doesn't look like a valid email: ${invalid}`
          );
          setSubmitting(false);
          return;
        }
      }

      const direction: MessageDirection = alsoSendAsEmail
        ? "email_outbound"
        : "internal";

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          caseId: caseId || null,
          direction,
          // These are for the upcoming email integration on the backend.
          sendAsEmail: alsoSendAsEmail,
          toEmails: parsedToEmails,
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

        {/* Right: case link, email options & actions */}
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

            {/* Email integration controls */}
            <div className="pt-2 border-t border-border space-y-2">
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={alsoSendAsEmail}
                  onChange={(e) => setAlsoSendAsEmail(e.target.checked)}
                  className="h-3 w-3 rounded border"
                />
                <span>Also send as email</span>
              </label>

              {alsoSendAsEmail && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    To (comma separated)
                  </label>
                  <input
                    type="text"
                    value={toEmails}
                    onChange={(e) => setToEmails(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="party1@example.com, party2@example.com"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Later we can auto-fill this from case contacts. For now you
                    can type one or more email addresses.
                  </p>
                  {emailFieldError && (
                    <p className="text-[11px] text-destructive">
                      {emailFieldError}
                    </p>
                  )}
                </div>
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
              Messages are private to you for now. When email sending is
              enabled, you&apos;ll be able to send these notes directly to
              parties while still keeping an internal record.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
