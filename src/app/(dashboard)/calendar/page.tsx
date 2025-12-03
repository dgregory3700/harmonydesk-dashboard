"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CalendarPage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<MediationSession[]>([]);
  const [cases, setCases] = useState<MediationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<"Upcoming" | "Completed" | "All">(
    "Upcoming"
  );

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [sessionsRes, casesRes] = await Promise.all([
          fetch("/api/sessions"),
          fetch("/api/cases"),
        ]);

        if (!sessionsRes.ok) {
          throw new Error("Failed to load sessions");
        }
        if (!casesRes.ok) {
          throw new Error("Failed to load cases");
        }

        const sessionsJson =
          (await sessionsRes.json()) as MediationSession[];
        const casesJson = (await casesRes.json()) as MediationCase[];

        setSessions(sessionsJson);
        setCases(casesJson);
      } catch (err: any) {
        console.error("Error loading calendar data:", err);
        setError(err?.message ?? "Failed to load calendar data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const caseById = useMemo(() => {
    const map = new Map<string, MediationCase>();
    for (const c of cases) {
      map.set(c.id, c);
    }
    return map;
  }, [cases]);

  const now = new Date();

  const enrichedSessions = useMemo(() => {
    return sessions
      .map((s) => {
        const caseInfo = caseById.get(s.caseId);
        return { ...s, caseInfo };
      })
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return da - db;
      });
  }, [sessions, caseById]);

  const filteredSessions = useMemo(() => {
    return enrichedSessions.filter((s) => {
      const d = new Date(s.date);
      const isFuture = d >= now;

      if (filter === "Upcoming") {
        return !s.completed && isFuture;
      }
      if (filter === "Completed") {
        return s.completed;
      }
      return true;
    });
  }, [enrichedSessions, filter, now]);

  function handleRowClick(id: string) {
    router.push(`/calendar/${id}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            See upcoming and past mediation sessions.
          </p>
        </div>

        <Link
          href="/cases"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Add session from a case
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Show:</span>

          <button
            type="button"
            onClick={() => setFilter("Upcoming")}
            className={`rounded-full border px-3 py-1 ${
              filter === "Upcoming"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            Upcoming
          </button>

          <button
            type="button"
            onClick={() => setFilter("Completed")}
            className={`rounded-full border px-3 py-1 ${
              filter === "Completed"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            Completed
          </button>

          <button
            type="button"
            onClick={() => setFilter("All")}
            className={`rounded-full border px-3 py-1 ${
              filter === "All"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            All
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Click any session to view details, mark completed, or delete.
        </p>
      </div>

      {/* Session list */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium">Sessions</h2>

        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading calendar…
          </p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : filteredSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sessions match this view. Add a session from a case, and
            it will appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((s) => {
              const caseInfo = s.caseInfo;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleRowClick(s.id)}
                  className="flex w-full flex-col gap-1 rounded-lg border bg-background p-3 text-left text-xs hover:bg-accent md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {caseInfo?.matter || "Mediation session"}
                    </p>
                    <p className="text-muted-foreground">
                      {formatDateTime(s.date)} • {s.durationHours} hr
                      {s.durationHours === 1 ? "" : "s"}
                    </p>
                    {caseInfo && (
                      <p className="text-muted-foreground">
                        {caseInfo.caseNumber} • {caseInfo.parties} •{" "}
                        {caseInfo.county}
                      </p>
                    )}
                    {s.notes && (
                      <p className="text-muted-foreground line-clamp-2">
                        {s.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-1 md:items-end">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        s.completed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {s.completed ? "Completed" : "Upcoming"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Date: {formatDateOnly(s.date)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
