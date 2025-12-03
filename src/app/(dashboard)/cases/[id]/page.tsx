"use client";

import { useEffect, useState, FormEvent } from "react";
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
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadgeClasses(status: CaseStatus) {
  if (status === "Open") return "bg-amber-100 text-amber-800";
  if (status === "Upcoming") return "bg-blue-100 text-blue-800";
  return "bg-emerald-100 text-emerald-800";
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = (params?.id as string) || "";

  const [caseData, setCaseData] = useState<MediationCase | null>(null);
  const [loadingCase, setLoadingCase] = useState(true);
  const [caseError, setCaseError] = useState<string | null>(null);

  const [localStatus, setLocalStatus] = useState<CaseStatus>("Open");
  const [localNotes, setLocalNotes] = useState("");
  const [savingCase, setSavingCase] = useState(false);
  const [caseSaveError, setCaseSaveError] = useState<string | null>(null);
  const [caseSaveSuccess, setCaseSaveSuccess] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<MediationSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Messages state (for this case)
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // New session form
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionDuration, setNewSessionDuration] = useState("1.0");
  const [newSessionNotes, setNewSessionNotes] = useState("");
  const [newSessionCompleted, setNewSessionCompleted] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [newSessionError, setNewSessionError] = useState<string | null>(null);

  // Invoice-from-case state
  const [invoiceRate, setInvoiceRate] = useState("200"); // default hourly rate
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Sum of completed session hours on this case
  const completedHours = sessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + (s.durationHours || 0), 0);

  useEffect(() => {
    if (!caseId) return;

    async function loadCase() {
      try {
        setLoadingCase(true);
        setCaseError(null);

        const res = await fetch(`/api/cases/${caseId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Case not found");
          }
          throw new Error("Failed to load case");
        }

        const data = (await res.json()) as MediationCase;
        setCaseData(data);
        setLocalStatus(data.status);
        setLocalNotes(data.notes ?? "");
      } catch (err: any) {
        console.error("Error loading case:", err);
        setCaseError(err?.message ?? "Failed to load case");
      } finally {
        setLoadingCase(false);
      }
    }

    loadCase();
  }, [caseId]);

  useEffect(() => {
    if (!caseId) return;

    async function loadSessions() {
      try {
        setLoadingSessions(true);
        setSessionsError(null);

        const res = await fetch(`/api/sessions?caseId=${caseId}`);
        if (!res.ok) {
          throw new Error("Failed to load sessions");
        }

        const data = (await res.json()) as MediationSession[];
        setSessions(data);
      } catch (err: any) {
        console.error("Error loading sessions:", err);
        setSessionsError(err?.message ?? "Failed to load sessions");
      } finally {
        setLoadingSessions(false);
      }
    }

    loadSessions();
  }, [caseId]);

  useEffect(() => {
    if (!caseId) return;

    async function loadMessages() {
      try {
        setLoadingMessages(true);
        setMessagesError(null);

        const res = await fetch(`/api/messages?caseId=${caseId}`);
        if (!res.ok) {
          throw new Error("Failed to load messages");
        }

        const data = (await res.json()) as Message[];
        setMessages(data);
      } catch (err: any) {
        console.error("Error loading messages for case:", err);
        setMessagesError(err?.message ?? "Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
  }, [caseId]);

  async function handleSaveCase() {
    if (!caseId) return;
    try {
      setSavingCase(true);
      setCaseSaveError(null);
      setCaseSaveSuccess(false);

      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: localStatus,
          notes: localNotes,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update case");
      }

      const updated = (await res.json()) as MediationCase;
      setCaseData(updated);
      setLocalStatus(updated.status);
      setLocalNotes(updated.notes ?? "");
      setCaseSaveSuccess(true);
    } catch (err: any) {
      console.error("Error saving case:", err);
      setCaseSaveError(err?.message ?? "Failed to save changes");
    } finally {
      setSavingCase(false);
    }
  }

  async function handleCreateSession(e: FormEvent) {
    e.preventDefault();
    if (!caseId || creatingSession) return;

    try {
      setCreatingSession(true);
      setNewSessionError(null);

      if (!newSessionDate.trim()) {
        setNewSessionError("Please choose a session date/time.");
        setCreatingSession(false);
        return;
      }

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          date: newSessionDate,
          durationHours: newSessionDuration,
          notes: newSessionNotes.trim() || null,
          completed: newSessionCompleted,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to create session");
      }

      const created = (await res.json()) as MediationSession;
      // Prepend new session to the list
      setSessions((prev) => [created, ...prev]);

      // Reset form
      setNewSessionDate("");
      setNewSessionDuration("1.0");
      setNewSessionNotes("");
      setNewSessionCompleted(false);
    } catch (err: any) {
      console.error("Error creating session:", err);
      setNewSessionError(err?.message ?? "Failed to create session");
    } finally {
      setCreatingSession(false);
    }
  }

  async function handleCreateInvoiceFromCase() {
    if (!caseData) return;

    try {
      setCreatingInvoice(true);
      setInvoiceError(null);

      const hoursToBill = completedHours;
      const rateNumber = Number.parseFloat(invoiceRate || "0");

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseNumber: caseData.caseNumber,
          matter: caseData.matter,
          contact: caseData.parties,
          hours: hoursToBill,
          rate: rateNumber,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to create invoice");
      }

      // Redirect to Billing & Courts where the new invoice will be at the top
      router.push("/billing");
    } catch (err: any) {
      console.error("Error creating invoice from case:", err);
      setInvoiceError(err?.message ?? "Failed to create invoice");
    } finally {
      setCreatingInvoice(false);
    }
  }

  if (loadingCase) {
    return (
      <div className="space-y-4">
        <Link
          href="/cases"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to cases
        </Link>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Loading case…</p>
        </div>
      </div>
    );
  }

  if (caseError || !caseData) {
    return (
      <div className="space-y-4">
        <Link
          href="/cases"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to cases
        </Link>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-destructive">
            {caseError || "Case not found."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb / back link */}
      <div className="flex flex-col gap-1">
        <Link
          href="/cases"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to cases
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {caseData.matter}
            </h1>
            <p className="text-sm text-muted-foreground">
              Case ID: {caseData.caseNumber}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${statusBadgeClasses(
                localStatus
              )}`}
            >
              {localStatus}
            </span>
            <span className="text-muted-foreground">
              Next session: {formatDate(caseData.nextSessionDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Left column: case info & notes & sessions & messages */}
        <div className="md:col-span-2 space-y-4">
          {/* Case info */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium mb-2">Case information</h2>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Parties</p>
                <p>{caseData.parties}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">County</p>
                <p>{caseData.county}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Matter</p>
                <p>{caseData.matter}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p>{localStatus}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium">Notes</h2>
              <span className="text-[11px] text-muted-foreground">
                Saved to this case when you click “Save changes”.
              </span>
            </div>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              rows={5}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this case, agreements reached, follow-up items…"
            />
          </div>

          {/* Session history */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Session history</h2>
              <span className="text-[11px] text-muted-foreground">
                Past and upcoming sessions for this case.
              </span>
            </div>

            {loadingSessions ? (
              <p className="text-sm text-muted-foreground">
                Loading sessions…
              </p>
            ) : sessionsError ? (
              <p className="text-sm text-destructive">
                {sessionsError}
              </p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sessions recorded yet. Add your first one below.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-1 rounded-md border bg-background p-2 text-xs md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        {formatDate(s.date)} • {s.durationHours} hr
                        {s.durationHours !== 1 ? "s" : ""}
                      </p>
                      {s.notes && (
                        <p className="text-muted-foreground line-clamp-2">
                          {s.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:items-start">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          s.completed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {s.completed ? "Completed" : "Upcoming"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add session form */}
            <form
              onSubmit={handleCreateSession}
              className="mt-3 space-y-2 rounded-md border bg-background p-3"
            >
              <p className="text-[11px] font-medium text-muted-foreground">
                Add session
              </p>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-[11px] text-muted-foreground">
                    Date & time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newSessionDate}
                    onChange={(e) => setNewSessionDate(e.target.value)}
                    className="w-full rounded-md border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] text-muted-foreground">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={newSessionDuration}
                    onChange={(e) => setNewSessionDuration(e.target.value)}
                    className="w-full rounded-md border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-muted-foreground">
                  Notes
                </label>
                <textarea
                  value={newSessionNotes}
                  onChange={(e) => setNewSessionNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What was covered in this session?"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={newSessionCompleted}
                    onChange={(e) =>
                      setNewSessionCompleted(e.target.checked)
                    }
                    className="h-3 w-3"
                  />
                  Mark as completed
                </label>

                <button
                  type="submit"
                  disabled={creatingSession}
                  className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {creatingSession ? "Adding…" : "Add session"}
                </button>
              </div>

              {newSessionError && (
                <p className="text-[11px] text-destructive mt-1">
                  {newSessionError}
                </p>
              )}
            </form>
          </div>

          {/* Messages for this case */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Messages for this case</h2>
              <Link
                href={`/messages/new?caseId=${caseData.id}`}
                className="text-[11px] font-medium text-blue-600 hover:underline"
              >
                + New message
              </Link>
            </div>

            {loadingMessages ? (
              <p className="text-sm text-muted-foreground">
                Loading messages…
              </p>
            ) : messagesError ? (
              <p className="text-sm text-destructive">{messagesError}</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No messages linked to this case yet. Create one to track
                important notes or communications.
              </p>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => (
                  <Link
                    key={m.id}
                    href={`/messages/${m.id}`}
                    className="flex flex-col gap-1 rounded-md border bg-background p-2 text-xs hover:bg-accent"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium line-clamp-1">
                        {m.subject}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(m.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {m.body}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: actions */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium mb-3">Actions</h2>

            {/* Status selector */}
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              Case status
            </label>
            <select
              className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={localStatus}
              onChange={(e) => setLocalStatus(e.target.value as CaseStatus)}
            >
              <option value="Open">Open</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Closed">Closed</option>
            </select>

            <button
              type="button"
              className="mb-2 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              onClick={handleSaveCase}
              disabled={savingCase}
            >
              {savingCase ? "Saving…" : "Save changes"}
            </button>

            {caseSaveError && (
              <p className="mt-2 text-xs text-destructive">
                {caseSaveError}
              </p>
            )}
            {caseSaveSuccess && !caseSaveError && (
              <p className="mt-2 text-xs text-emerald-700">
                Changes saved.
              </p>
            )}

            {/* Invoice from case */}
            <div className="mt-4 border-t pt-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Completed session hours on this case:{" "}
                <span className="font-medium">
                  {completedHours.toFixed(2)} hr
                  {completedHours === 1 ? "" : "s"}
                </span>
              </p>

              <div className="space-y-1">
                <label className="block text-[11px] text-muted-foreground">
                  Hourly rate for this invoice
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={invoiceRate}
                  onChange={(e) => setInvoiceRate(e.target.value)}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                className="w-full rounded-md border px-3 py-2 text-xs font-medium hover:bg-accent disabled:opacity-60"
                onClick={handleCreateInvoiceFromCase}
                disabled={creatingInvoice}
              >
                {creatingInvoice
                  ? "Creating invoice…"
                  : "Create invoice from this case"}
              </button>

              {/* Existing “New message about this case” button on the right */}
              <Link
                href={`/messages/new?caseId=${caseData.id}`}
                className="mt-2 block w-full rounded-md border px-3 py-2 text-center text-xs font-medium hover:bg-accent"
              >
                New message about this case
              </Link>

              {invoiceError && (
                <p className="text-xs text-destructive">{invoiceError}</p>
              )}

              <p className="text-[11px] text-muted-foreground">
                We&apos;ll create a Draft invoice in Billing &amp; Courts
                using the case details and completed session hours. You can
                adjust hours and rate before sending.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground shadow-sm">
            <p className="font-medium mb-1">What&apos;s next?</p>
            <p>
              Now that cases, sessions, invoices, and messages are connected,
              we can move on to Clients and Settings to finish your production
              flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
