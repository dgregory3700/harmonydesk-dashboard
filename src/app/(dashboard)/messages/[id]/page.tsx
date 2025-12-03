"use client";

import { useEffect, useState } from "react";
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

type Message = {
  id: string;
  caseId: string | null;
  subject: string;
  body: string;
  createdAt: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

  useEffect(() => {
    if (!messageId) return;

    async function loadMessage() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/messages/${messageId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Message not found");
          }
          throw new Error("Failed to load message");
        }

        const data = (await res.json()) as Message;
        setMessage(data);

        if (data.caseId) {
          setLoadingCase(true);
          const caseRes = await fetch(`/api/cases/${data.caseId}`);
          if (!caseRes.ok) {
            if (caseRes.status === 404) {
              throw new Error("Case not found for this message");
            }
            throw new Error("Failed to load case for this message");
          }

          const caseJson = (await caseRes.json()) as MediationCase;
          setCaseData(caseJson);
        }
      } catch (err: any) {
        console.error("Error loading message:", err);
        setError(err?.message ?? "Failed to load message");
      } finally {
        setLoading(false);
        setLoadingCase(false);
      }
    }

    loadMessage();
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Link
          href="/messages"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to messages
        </Link>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="space-y-4">
        <Link
          href="/messages"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to messages
        </Link>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-destructive">
            {error || "Message not found."}
          </p>
        </div>
      </div>
    );
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {message.subject}
            </h1>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(message.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Left: body */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
            <h2 className="text-sm font-medium">Message</h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {message.body}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Linked case</h2>
              {caseData && (
                <Link
                  href={`/cases/${caseData.id}`}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  View case →
                </Link>
              )}
            </div>

            {loadingCase ? (
              <p className="text-sm text-muted-foreground">
                Loading case information…
              </p>
            ) : caseError ? (
              <p className="text-sm text-destructive">{caseError}</p>
            ) : !caseData ? (
              <p className="text-sm text-muted-foreground">
                No case linked to this message.
              </p>
            ) : (
              <div className="rounded-md border bg-background p-3 text-xs space-y-1">
                <p className="font-medium">{caseData.matter}</p>
                <p className="text-muted-foreground">
                  {caseData.caseNumber} • {caseData.parties}
                </p>
                <p className="text-muted-foreground">
                  {caseData.county} • Next session:{" "}
                  {formatDate(caseData.nextSessionDate)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full rounded-md border px-3 py-2 text-xs font-medium text-destructive hover:bg-accent/40 disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete message"}
            </button>

            {deleteError && (
              <p className="text-xs text-destructive">{deleteError}</p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground shadow-sm">
            <p className="font-medium mb-1">Tip</p>
            <p>
              Use messages as an internal log: what was discussed, safety
              concerns, agreements-in-principle, or things to prepare before
              the next session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
