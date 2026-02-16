"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
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

type ApiMessage = {
  id: string;
  userEmail?: string;
  caseId: string | null;
  subject: string;
  body: string;
  createdAt: string;
  direction?: "internal" | "email_outbound";
  to_emails?: string | null;
  from_email?: string | null;
  sent_at?: string | null;
  email_status?: "pending" | "sent" | "failed" | null;
};

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function NewMessagePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCaseId = searchParams.get("caseId");

  const [cases, setCases] = useState<MediationCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);

  const [caseId, setCaseId] = useState<string | "">("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [sendAsEmail, setSendAsEmail] = useState(false);
  const [toEmail, setToEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If email fails but message is saved, the API returns { message } with non-200.
  const [savedMessageId, setSavedMessageId] = useState<string | null>(null);

  const emailFieldError = useMemo(() => {
    if (!sendAsEmail) return null;
    const v = toEmail.trim();
    if (!v) return "Please provide an email address to send to.";
    if (!isValidEmail(v)) return "This doesn't look like a valid email address.";
    return null;
  }, [sendAsEmail, toEmail]);

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
    if (!preselectedCaseId) return;
    if (!cases || cases.length === 0) return;

    setCaseId((current) => {
      if (current) return current;
      const match = cases.find((c) => c.id === preselectedCaseId);
      return match ? match.id : current;
    });
  }, [preselectedCaseId, cases]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      setSavedMessageId(null);

      if (!subject.trim() || !body.trim()) {
        setError("Subject and message body are required.");
        setSubmitting(false);
        return;
      }

      if (emailFieldError) {
        setError(emailFieldError);
        setSubmitting(false);
        return;
      }

      const payload: any = {
        subject: subject.trim(),
        body: body.trim(),
        caseId: caseId || null,
        sendAsEmail: sendAsEmail,
        toEmails: sendAsEmail ? [toEmail.trim()] : [],
        direction: sendAsEmail ? "email_outbound" : "internal",
      };

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        // Truthful behavior: if the message was saved but email failed,
        // API returns { error, message } with non-200.
        const maybeMsg = (json?.message ?? null) as ApiMessage | null;
        if (maybeMsg?.id) {
          setSavedMessageId(maybeMsg.id);
        }
        throw new Error(json?.error || "Failed to create message");
      }

      const message = (json?.message ?? json) as ApiMessage;

      if (!message?.id) {
        throw new Error("Message created, but response was missing an id.");
      }

      router.push(`/messages/${message.id}`);
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
            Add an internal note or message, optionally linked to a case. You
            can also choose to send it as an email.
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
                onChange={(e) => setSubject(e.target.value)}
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
                onChange={(e) => setBody(e.target.value)}
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

            <div className="space-y-2 border-t border-slate-800 pt-3 mt-2">
              <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-sky-500"
                  checked={sendAsEmail}
                  onChange={(e) => setSendAsEmail(e.target.checked)}
                />
                <span>Also send this as an email</span>
              </label>

              {sendAsEmail && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-400">
                    To email
                  </label>
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="person@example.com"
                  />
                  <p className="text-[11px] text-slate-500">
                    Sent via Resend from{" "}
                    <span className="font-medium text-slate-400">
                      {process.env.NEXT_PUBLIC_HD_EMAIL_FROM ||
                        "your verified sender"}
                    </span>
                    .
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

            {error && (
              <div className="space-y-2">
                <p className="text-xs text-red-400">{error}</p>
                {savedMessageId && (
                  <Link
                    href={`/messages/${savedMessageId}`}
                    className="inline-block text-xs font-medium text-sky-400 hover:text-sky-300 hover:underline"
                  >
                    View saved message →
                  </Link>
                )}
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              Deterministic rule: the UI only claims email delivery when the
              provider confirms success.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewMessagePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="text-sm text-slate-400">Loading…</div>
        </div>
      }
    >
      <NewMessagePageInner />
    </Suspense>
  );
}
