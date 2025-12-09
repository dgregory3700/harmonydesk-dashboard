"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
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

// Inner component that actually uses useSearchParams
function NewMessagePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCaseId = searchParams.get("caseId"); // e.g. /messages/new?caseId=123

  const [cases, setCases] = useState<MediationCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);

  const [caseId, setCaseId] = useState<string | "">("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // email options
  const [sendAsEmail, setSendAsEmail] = useState(false);
  const [toEmail, setToEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailInfo, setEmailInfo] = useState<string | null>(null);

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

  // 🔽 Preselect from ?caseId=... once cases are loaded
  useEffect(() => {
    if (!preselectedCaseId) return;
    if (!cases || cases.length === 0) return;

    setCaseId((current) => {
      // don't override if user has already chosen something
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
      setEmailInfo(null);

      if (!subject.trim() || !body.trim()) {
        setError("Subject and message body are required.");
        setSubmitting(false);
        return;
      }

      if (sendAsEmail && !toEmail.trim()) {
        setError("Please provide an email address to send to.");
        setSubmitting(false);
        return;
      }

      // 1) Save the message like before
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

      // 2) Optionally send email (does NOT affect saving)
      if (sendAsEmail && toEmail.trim()) {
        try {
          const emailRes = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: subject.trim(),
              body: body.trim(),
              to: [toEmail.trim()],
              caseId: created.id,
            }),
          });

          if (emailRes.ok) {
            const emailJson = await emailRes.json().catch(() => ({}));
            setEmailInfo(
              `Email sent via ${emailJson.provider || "sendgrid"} from ${
                emailJson.from || "contact@harmonydesk.ai"
              }.`
            );
          } else {
            console.error("Email send failed with status:", emailRes.status);
            setEmailInfo("Message saved, but sending email failed.");
          }
        } catch (err) {
          console.error("Error calling /api/send-email:", err);
          setEmailInfo("Message saved, but sending email failed.");
        }
      }

      // 3) Go to message detail
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
            Add an internal note or message, optionally linked to a case. You
            can also choose to send it as an email.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
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
                onChange={(e) => setSubject(e.target.value)}
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
                onChange={(e) => setBody(e.target.value)}
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
            {/* Link to case */}
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
                  onChange={(e) => setCaseId(e.target.value)}
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

            {/* Email options */}
            <div className="space-y-2 border-t pt-3 mt-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={sendAsEmail}
                  onChange={(e) => setSendAsEmail(e.target.checked)}
                />
                <span>Also send this as an email</span>
              </label>

              {sendAsEmail && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">
                    To email
                  </label>
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="person@example.com"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    For now, emails are sent from{" "}
                    <span className="font-medium">
                      contact@harmonydesk.ai
                    </span>
                    .
                  </p>
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

            {emailInfo && (
              <p className="text-[11px] text-muted-foreground">
                {emailInfo}
              </p>
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

// Wrapper that provides the Suspense boundary required for useSearchParams
export default function NewMessagePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <NewMessagePageInner />
    </Suspense>
  );
}
