"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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

type MessageDirection = "internal" | "email_outbound";

type Message = {
  id: string;
  caseId: string | null;
  subject: string;
  body: string;
  createdAt: string;

  // email fields (now returned by API)
  direction?: MessageDirection;
  to_emails?: string | null;
  from_email?: string | null;
  sent_at?: string | null;
  email_status?: "pending" | "sent" | "failed" | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const messageId = (params?.id as string) || "";

  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [caseData, setCaseData] = useState<MediationCase | null>(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Send-as-email controls (for existing messages)
  const [showEmailSend, setShowEmailSend] = useState(false);
  const [toEmails, setToEmails] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const parsedToEmails = useMemo(() => {
    return toEmails
      .split(/[,\s]+/)
      .map((v: string) => v.trim())
      .filter((v: string) => v.length > 0);
  }, [toEmails]);

  const emailFieldError = useMemo(() => {
    if (!showEmailSend) return null;
    if (!toEmails.trim()) return "Please enter at least one recipient email.";
    const bad = parsedToEmails.find((addr: string) => !isValidEmail(addr));
    if (bad) return `Invalid email: ${bad}`;
    return null;
  }, [showEmailSend, toEmails, parsedToEmails]);

  async function fetchMessageAndCase() {
    if (!messageId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/messages/${messageId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Message not found");
        throw new Error("Failed to load message");
      }

      const data = (await res.json()) as Message;
      setMessage(data);

      // Load linked case (if any)
      if (data.caseId) {
        setLoadingCase(true);
        setCaseError(null);

        const caseRes = await fetch(`/api/cases/${data.caseId}`);
        if (!caseRes.ok) {
          if (caseRes.status === 404) throw new Error("Case not found for this message");
          throw new Error("Failed to load case for this message");
        }

        const caseJson = (await caseRes.json()) as MediationCase;
        setCaseData(caseJson);
      } else {
        setCaseData(null);
      }
    } catch (err: any) {
      console.error("Error loading message:", err);
      setError(err?.message ?? "Failed to load message");
    } finally {
      setLoading(false);
      setLoadingCase(false);
    }
  }

  useEffect(() => {
    fetchMessageAndCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId]);

  async function handleDelete() {
    if (!message) return;

    const confirmDelete = window.confirm(
      "Delete this message? This cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      setDeleting(true);
      setDeleteError(null);

      const res = await fetch(`/api/messages/${message.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to delete message");
      }

      router.push("/messages");
    } catch (err: any) {
      console.error("Error deleting message:", err);
      setDeleteError(err?.message ?? "Failed to delete message");
      setDeleting(false);
    }
  }

  async function handleSendAsEmail() {
    if (!message) return;
    setSendError(null);
    setSendSuccess(null);

    if (emailFieldError) {
      setSendError(emailFieldError);
      return;
    }

    try {
      setSendingEmail(true);

      const res = await fetch(`/api/messages/${message.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmails: parsedToEmails }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setSendError(json?.error || "Failed to send email");
        // Even on failure, message may be updated (failed/pending). Refresh to reflect truth.
        await fetchMessageAndCase();
        setSendingEmail(false);
        return;
      }

      setSendSuccess("Email sent (provider-confirmed).");
      await fetchMessageAndCase();
      setSendingEmail(false);
    } catch (err: any) {
      console.error("Error sending email:", err);
      setSendError(err?.message ?? "Failed to send email");
      setSendingEmail(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Link
          href="/messages"
          className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
        >
          ← Back to messages
        </Link>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="space-y-4">
        <Link
          href="/messages"
          className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
        >
          ← Back to messages
        </Link>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-red-400">{error || "Message not found."}</p>
        </div>
      </div>
    );
  }

  const statusLabel =
    message.email_status === "sent"
      ? `Sent ${formatDate(message.sent_at)}`
      : message.email_status === "failed"
      ? "Failed to send"
      : message.email_status === "pending"
      ? "Pending send"
      : "Internal only";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/messages"
          className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
        >
          ← Back to messages
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
              {message.subject}
            </h1>
            <p className="text-sm text-slate-400">
              Created {formatDate(message.createdAt)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Email status: {statusLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-2">
            <h2 className="text-sm font-medium text-slate-300">Message</h2>
            <p className="whitespace-pre-line text-sm text-slate-400">
              {message.body}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-300">Linked case</h2>
              {caseData && (
                <Link
                  href={`/cases/${caseData.id}`}
                  className="text-xs font-medium text-sky-400 hover:text-sky-300 hover:underline transition-colors"
                >
                  View case →
                </Link>
              )}
            </div>

            {loadingCase ? (
              <p className="text-sm text-slate-500">Loading case information…</p>
            ) : caseError ? (
              <p className="text-sm text-red-400">{caseError}</p>
            ) : !caseData ? (
              <p className="text-sm text-slate-500">
                No case linked to this message.
              </p>
            ) : (
              <div className="rounded-md border border-slate-700 bg-slate-950 p-3 text-xs space-y-1">
                <p className="font-medium text-slate-200">{caseData.matter}</p>
                <p className="text-slate-400">
                  {caseData.caseNumber} • {caseData.parties}
                </p>
                <p className="text-slate-500">
                  {caseData.county} • Next session:{" "}
                  {formatDate(caseData.nextSessionDate)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Send as email */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-300">Send as email</p>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-sky-500"
                  checked={showEmailSend}
                  onChange={(e) => {
                    setShowEmailSend(e.target.checked);
                    setSendError(null);
                    setSendSuccess(null);
                  }}
                />
                Enable
              </label>
            </div>

            {showEmailSend ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-400">
                    To (comma separated)
                  </label>
                  <input
                    type="text"
                    value={toEmails}
                    onChange={(e) => setToEmails(e.target.value)}
                    placeholder="party1@example.com, party2@example.com"
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Deterministic rule: we only show success when Resend confirms
                    success.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendAsEmail}
                  disabled={sendingEmail}
                  className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60 transition-colors"
                >
                  {sendingEmail ? "Sending…" : "Send email"}
                </button>

                {sendError && <p className="text-xs text-red-400">{sendError}</p>}
                {sendSuccess && (
                  <p className="text-xs text-emerald-400">{sendSuccess}</p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Turn this on to email an existing message (provider-direct).
              </p>
            )}
          </div>

          {/* Delete */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full rounded-md border border-slate-700 bg-transparent px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/20 hover:border-red-800 disabled:opacity-60 transition-colors"
            >
              {deleting ? "Deleting…" : "Delete message"}
            </button>

            {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-500 shadow-sm">
            <p className="font-medium mb-1 text-slate-400">Tip</p>
            <p>
              Use messages as an internal log: what was discussed, safety
              concerns, agreements-in-principle, or things to prepare before the
              next session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
