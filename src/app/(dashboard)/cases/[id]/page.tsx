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

type UserSettings = {
  defaultHourlyRate: number | null;
  defaultSessionDuration: number | null;
};

type MessageSummary = {
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

// Updated for Dark Mode badges
function statusBadgeClasses(status: CaseStatus) {
  if (status === "Open") return "border border-amber-500/20 bg-amber-500/10 text-amber-400";
  if (status === "Upcoming") return "border border-sky-500/20 bg-sky-500/10 text-sky-400";
  return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
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

  // Messages linked to this case
  const [messages, setMessages] = useState<MessageSummary[]>([]);
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
  const [invoiceRate, setInvoiceRate] = useState("200"); // will be overridden by Settings if present
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Settings for auto-fill
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [initializedFromSettings, setInitializedFromSettings] =
    useState(false);

  // Sum of completed session hours on this case
  const completedHours = sessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + (s.durationHours || 0), 0);

  // Load case details
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

  // Load sessions
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

  // Load messages for this case
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

        const data = (await res.json()) as MessageSummary[];
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

  // Load user settings and initialize defaults (once)
  useEffect(() => {
    async function loadSettings() {
      try {
        setSettingsLoading(true);
        setSettingsError(null);

        const res = await fetch("/api/user-settings");
        if (!res.ok) {
          throw new Error("Failed to load settings");
        }

        const data = await res.json();
        const parsed: UserSettings = {
          defaultHourlyRate:
            data && typeof data.defaultHourlyRate === "number"
              ? data.defaultHourlyRate
              : data && data.defaultHourlyRate != null
              ? Number(data.defaultHourlyRate)
              : null,
          defaultSessionDuration:
            data && typeof data.defaultSessionDuration === "number"
              ? data.defaultSessionDuration
              : data && data.defaultSessionDuration != null
              ? Number(data.defaultSessionDuration)
              : null,
        };

        setSettings(parsed);

        // Only apply defaults the first time we load settings
        if (!initializedFromSettings) {
          if (
            parsed.defaultHourlyRate != null &&
            !Number.isNaN(parsed.defaultHourlyRate)
          ) {
            setInvoiceRate(String(parsed.defaultHourlyRate));
          }
          if (
            parsed.defaultSessionDuration != null &&
            !Number.isNaN(parsed.defaultSessionDuration)
          ) {
            setNewSessionDuration(String(parsed.defaultSessionDuration));
          }
          setInitializedFromSettings(true);
        }
      } catch (err: any) {
        console.error("Error loading settings in CaseDetailPage:", err);
        setSettingsError(err?.message ?? "Failed to load settings");
      } finally {
        setSettingsLoading(false);
      }
    }

    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // we only want to run this once on mount for defaults

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

      // Reset form (but keep default duration from Settings if we have one)
      setNewSessionDate("");
      if (
        settings &&
        settings.defaultSessionDuration != null &&
        !Number.isNaN(settings.defaultSessionDuration)
      ) {
        setNewSessionDuration(String(settings.defaultSessionDuration));
      } else {
        setNewSessionDuration("1.0");
      }
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
          className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
        >
          ← Back to cases
        </Link>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400">Loading case…</p>
        </div>
      </div>
    );
  }

  if (caseError || !caseData) {
    return (
      <div className="space-y-4">
        <Link
          href="/cases"
          className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
        >
          ← Back to cases
        </Link>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-red-400">
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
          className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
        >
          ← Back to cases
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
              {caseData.matter}
            </h1>
            <p className="text-sm text-slate-400">
              Case ID: {caseData.caseNumber}
            </p>
            {settingsLoading && (
              <p className="mt-1 text-[11px] text-slate-500">
                Loading your default billing settings…
              </p>
            )}
            {settingsError && (
              <p className="mt-1 text-[11px] text-red-400">
                {settingsError}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${statusBadgeClasses(
                localStatus
              )}`}
            >
              {localStatus}
            </span>
            <span className="text-slate-400">
              Next session: {formatDate(caseData.nextSessionDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Left column: case info, notes, sessions */}
        <div className="md:col-span-2 space-y-4">
          {/* Case info */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
            <h2 className="text-sm font-medium mb-2 text-slate-200">Case information</h2>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Parties</p>
                <p className="text-slate-300">{caseData.parties}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">County</p>
                <p className="text-slate-300">{caseData.county}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Matter</p>
                <p className="text-slate-300">{caseData.matter}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className="text-slate-300">{localStatus}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium text-slate-200">Notes</h2>
              <span className="text-[11px] text-slate-500">
                Saved to this case when you click “Save changes”.
              </span>
            </div>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Add notes about this case, agreements reached, follow-up items…"
            />
          </div>

          {/* Session history */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-200">Session history</h2>
              <span className="text-[11px] text-slate-500">
                Past and upcoming sessions for this case.
              </span>
            </div>

            {loadingSessions ? (
              <p className="text-sm text-slate-500">
                Loading sessions…
              </p>
            ) : sessionsError ? (
              <p className="text-sm text-red-400">
                {sessionsError}
              </p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No sessions recorded yet. Add your first one below.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-1 rounded-md border border-slate-800 bg-slate-950 p-2 text-xs md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium text-slate-200">
                        {formatDate(s.date)} • {s.durationHours} hr
                        {s.durationHours !== 1 ? "s" : ""}
                      </p>
                      {s.notes && (
                        <p className="text-slate-400 line-clamp-2">
                          {s.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:items-start">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                          s.completed
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-sky-500/20 bg-sky-500/10 text-sky-400"
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
              className="mt-3 space-y-2 rounded-md border border-slate-700 bg-slate-950 p-3"
            >
              <p className="text-[11px] font-medium text-slate-400">
                Add session
              </p>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-500">
                    Date & time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newSessionDate}
                    onChange={(e) => setNewSessionDate(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-500">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={newSessionDuration}
                    onChange={(e) => setNewSessionDuration(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                  {settings &&
                    settings.defaultSessionDuration != null && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Pre-filled from your default session duration in
                        Settings. Adjust as needed before saving.
                      </p>
                    )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-500">
                  Notes
                </label>
                <textarea
                  value={newSessionNotes}
                  onChange={(e) => setNewSessionNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="What was covered in this session?"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={newSessionCompleted}
                    onChange={(e) =>
                      setNewSessionCompleted(e.target.checked)
                    }
                    className="h-3 w-3 rounded border border-slate-600 bg-slate-900 accent-sky-500"
                  />
                  Mark as completed
                </label>

                <button
                  type="submit"
                  disabled={creatingSession}
                  className="rounded-md bg-sky-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-sky-500 disabled:opacity-60 transition-colors"
                >
                  {creatingSession ? "Adding…" : "Add session"}
                </button>
              </div>

              {newSessionError && (
                <p className="text-[11px] text-red-400 mt-1">
                  {newSessionError}
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Right column: actions + messages panel + helper text */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
            <h2 className="text-sm font-medium mb-3 text-slate-200">Actions</h2>

            {/* Status selector */}
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Case status
            </label>
            <select
              className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={localStatus}
              onChange={(e) => setLocalStatus(e.target.value as CaseStatus)}
            >
              <option value="Open">Open</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Closed">Closed</option>
            </select>

            <button
              type="button"
              className="mb-2 w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60 transition-colors"
              onClick={handleSaveCase}
              disabled={savingCase}
            >
              {savingCase ? "Saving…" : "Save changes"}
            </button>

            {caseSaveError && (
              <p className="mt-2 text-xs text-red-400">
                {caseSaveError}
              </p>
            )}
            {caseSaveSuccess && !caseSaveError && (
              <p className="mt-2 text-xs text-emerald-400">
                Changes saved.
              </p>
            )}

            {/* Invoice from case */}
            <div className="mt-4 border-t border-slate-800 pt-3 space-y-2">
              <p className="text-[11px] text-slate-400">
                Completed session hours on this case:{" "}
                <span className="font-medium text-slate-200">
                  {completedHours.toFixed(2)} hr
                  {completedHours === 1 ? "" : "s"}
                </span>
              </p>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-500">
                  Hourly rate for this invoice
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={invoiceRate}
                  onChange={(e) => setInvoiceRate(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
                {settings &&
                  settings.defaultHourlyRate != null && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Pre-filled from your default hourly rate in Settings.
                      You can adjust this before creating the invoice.
                    </p>
                  )}
              </div>

              <button
                type="button"
                className="w-full rounded-md border border-slate-700 bg-transparent px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-60 transition-colors"
                onClick={handleCreateInvoiceFromCase}
                disabled={creatingInvoice}
              >
                {creatingInvoice
                  ? "Creating invoice…"
                  : "Create invoice from this case"}
              </button>

              {invoiceError && (
                <p className="text-xs text-red-400">{invoiceError}</p>
              )}

              <p className="text-[11px] text-slate-500">
                We&apos;ll create a Draft invoice in Billing &amp; Courts
                using the case details and completed session hours. You can
                review and adjust all numbers before sending anything to
                clients or court.
              </p>
            </div>
          </div>

          {/* Messages panel (now in right column) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-200">
                Messages &amp; internal notes
              </h2>
              <div className="flex gap-2">
                <Link
                  href={`/messages/new?caseId=${caseId}`}
                  className="text-[11px] font-medium text-sky-400 hover:text-sky-300 hover:underline transition-colors"
                >
                  Add message
                </Link>
                <Link
                  href={`/messages?caseId=${caseId}`}
                  className="text-[11px] text-slate-400 hover:text-slate-200 hover:underline transition-colors"
                >
                  View all
                </Link>
              </div>
            </div>

            {loadingMessages ? (
              <p className="text-sm text-slate-500">
                Loading messages…
              </p>
            ) : messagesError ? (
              <p className="text-sm text-red-400">{messagesError}</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-slate-500">
                No messages linked to this case yet. Use “Add message” to log
                prep notes, safety concerns, or things to cover next time.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {messages.slice(0, 5).map((m) => (
                  <Link
                    key={m.id}
                    href={`/messages/${m.id}`}
                    className="block rounded-md border border-slate-800 bg-slate-950 p-2 text-xs hover:bg-slate-900 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-200 line-clamp-1">
                        {m.subject || "Untitled message"}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {formatDate(m.createdAt)}
                      </span>
                    </div>
                    {m.body && (
                      <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">
                        {m.body}
                      </p>
                    )}
                  </Link>
                ))}
                {messages.length > 5 && (
                  <p className="text-[11px] text-slate-500">
                    Showing the 5 most recent messages. Use “View all” to see
                    the full history.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Helper text */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-500 shadow-sm">
            <p className="font-medium mb-1 text-slate-400">What&apos;s next?</p>
            <p>
              Now that cases, sessions, invoices, and messages are connected,
              you have a full history for each matter in one place. You can
              move on to county reports and fine-tuning your billing workflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
