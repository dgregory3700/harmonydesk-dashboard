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
  direction?: MessageDirection;
  to_emails?: string | null;
  from_email?: string | null;
  sent_at?: string | null;
  email_status?: "pending" | "sent" | "failed" | null;
};

function buildSubjectForCase(c: MediationCase): string {
  if (c.matter && c.caseNumber) return `Notes for ${c.matter} (${c.caseNumber})`;
  if (c.matter) return `Notes for ${c.matter}`;
  if (c.caseNumber) return `Notes for case ${c.caseNumber}`;
  return "Case notes";
}

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
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

  const [subjectDirty, setSubjectDirty] = useState(false);
  const [bodyDirty, setBodyDirty] = useState(false);

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
        if (!res.ok) throw new Error("Failed to load cases");

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

  useEffect(() => {
    if (!caseId) return;
    if (!cases || cases.length === 0) return;

    const selected = cases.find((c) => c.id === caseId);
    if (!selected) return;

    if (!subjectDirty && subject.trim() === "") {
      setSubject(buildSubjectForCase(selected));
    }

    if (!bodyDirty && body.trim() === "" && selected.notes?.trim()) {
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
          setEmailFieldError("Please enter at least one recipient email address.");
          setSubmitting(false);
          return;
        }

        parsedToEmails = toEmails
          .split(/[,\s]+/)
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 0);

        if (parsedToEmails.length === 0) {
          setEmailFieldError("Please enter at least one valid email address.");
          setSubmitting(false);
          return;
        }

        const invalid = parsedToEmails.find((addr: string) => !isValidEmail(addr));
        if (invalid) {
          setEmailFieldError(`This doesn't look like a valid email: ${invalid}`);
          setSubmitting(false);
          return;
        }
      }

      const direction: MessageDirection = alsoSendAsEmail ? "email_outbound" : "internal";

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          caseId: caseId || null,
          direction,
          sendAsEmail: alsoSendAsEmail,
          toEmails: parsedToEmails,
        }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to create message");
      }

      const created = json?.message ?? (json as Message);
      router.push(`/messages/${created.id}`);
    } catch (err: any) {
      console.error("Error creating message:", err);
      setError(err?.message ?? "Failed to create message");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/messages"
          className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
        >
          ← Back to messages
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            New message
          </h1>
          <p className="text-sm text-slate-400">
            Add an internal note or message, optionally linked to a case.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (!subjectDirty) setSubjectDirty(true);
                }}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Example: Prep notes for Johnson / Lee mediation"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Message *
              </label>
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (!bodyDirty) setBodyDirty(true);
                }}
                rows={8}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Internal note, safety concerns, what to cover in the next session, etc."
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Link to case (optional)
              </label>
              {loadingCases ? (
                <p className="text-xs text-slate-500">Loading cases…</p>
              ) : casesError ? (
                <p className="text-xs text-red-400">{casesError}</p>
              ) : (
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
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

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoSendAsEmail}
                  onChange={(e) => setAlsoSendAsEmail(e.target.checked)}
                  className="h-3 w-3 rounded border border-slate-600 bg-slate-900 accent-sky-500"
                />
                <span>Also send as email</span>
              </label>

              {alsoSendAsEmail && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-400">
                    To (comma separated)
                  </label>
                  <input
                    type="text"
                    value={toEmails}
                    onChange={(e) => setToEmails(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="party1@example.com, party2@example.com"
                  />
                  {emailFieldError && (
                    <p className="text-[11px] text-red-400">{emailFieldError}</p>
                  )}
                  <p className="text-[10px] text-slate-500">
                    This sends provider-direct via Resend and records truthful
                    status on the message.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Saving…" : "Save message"}
            </button>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <p className="text-[11px] text-slate-500">
              Messages are private to you for now. Email sending is provider-direct and
              always truthful (no silent success).
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
