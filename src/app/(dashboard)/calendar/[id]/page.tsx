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

type MediationSession = {
  id: string;
  userEmail: string;
  caseId: string;
  date: string;
  durationHours: number;
  notes: string | null;
  completed: boolean;
};

function formatDateTime(value?: string | null) {
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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = (params?.id as string) || "";

  const [session, setSession] = useState<MediationSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [caseData, setCaseData] = useState<MediationCase | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);

  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    async function loadSession() {
      try {
        setSessionLoading(true);
        setSessionError(null);

        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Session not found");
          }
          throw new Error("Failed to load session");
        }

        const data = (await res.json()) as MediationSession;
        setSession(data);

        // Also load the related case
        if (data.caseId) {
          setCaseLoading(true);
          const caseRes = await fetch(`/api/cases/${data.caseId}`);
          if (!caseRes.ok) {
            if (caseRes.status === 404) {
              throw new Error("Case not found for this session");
            }
            throw new Error("Failed to load case for this session");
          }
          const caseJson = (await caseRes.json()) as MediationCase;
          setCaseData(caseJson);
        }
      } catch (err: any) {
        console.error("Error loading session detail:", err);
        setSessionError(err?.message ?? "Failed to load session");
      } finally {
        setSessionLoading(false);
        setCaseLoading(false);
      }
    }

    loadSession();
  }, [sessionId]);

  async function toggleCompleted() {
    if (!session || updating) return;

    try {
      setUpdating(true);
      setUpdateError(null);
      setUpdateSuccess(false);

      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: !session.completed,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to update session");
      }

      const updated = (await res.json()) as MediationSession;
      setSession(updated);
      setUpdateSuccess(true);
    } catch (err: any) {
      console.error("Error updating session:", err);
      setUpdateError(err?.message ?? "Failed to update session");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!session) return;
    const confirmDelete = window.confirm(
      "Delete this session? This will not delete the case."
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to delete session");
      }

      // After delete, send user back to calendar
      router.push("/calendar");
    } catch (err: any) {
      console.error("Error deleting session:", err);
      setUpdateError(err?.message ?? "Failed to delete session");
    }
  }

  if (sessionLoading) {
    return (
      <div className="space-y-4">
        <Link
          href="/calendar"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to calendar
        </Link>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Loading session…</p>
        </div>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="space-y-4">
        <Link
          href="/calendar"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to calendar
        </Link>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-destructive">
            {sessionError || "Session not found."}
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
          href="/calendar"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to calendar
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Mediation session
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(session.date)} • {session.durationHours} hr
              {session.durationHours === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                session.completed
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {session.completed ? "Completed" : "Upcoming"}
            </span>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Left: session + notes */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
            <h2 className="text-sm font-medium">Session details</h2>
            <dl className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  Date & time
                </dt>
                <dd>{formatDateTime(session.date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Duration
                </dt>
                <dd>
                  {session.durationHours} hr
                  {session.durationHours === 1 ? "" : "s"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Status
                </dt>
                <dd>{session.completed ? "Completed" : "Upcoming"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Notes</h2>
              <span className="text-[11px] text-muted-foreground">
                Notes are stored on this individual session.
              </span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {session.notes || "No notes recorded for this session yet."}
            </p>
          </div>

          {/* Linked case */}
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

            {caseLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading case information…
              </p>
            ) : caseError ? (
              <p className="text-sm text-destructive">{caseError}</p>
            ) : !caseData ? (
              <p className="text-sm text-muted-foreground">
                No case record found for this session.
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
              onClick={toggleCompleted}
              disabled={updating}
              className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {updating
                ? "Updating…"
                : session.completed
                ? "Mark as upcoming"
                : "Mark as completed"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="w-full rounded-md border px-3 py-2 text-xs font-medium text-destructive hover:bg-accent/40"
            >
              Delete session
            </button>

            {updateError && (
              <p className="text-xs text-destructive">{updateError}</p>
            )}
            {updateSuccess && !updateError && (
              <p className="text-xs text-emerald-700">Session updated.</p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground shadow-sm">
            <p className="font-medium mb-1">Tip</p>
            <p>
              From here you can quickly mark sessions as completed after
              they finish, so your billing module always has up-to-date
              hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
