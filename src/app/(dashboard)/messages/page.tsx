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

export default function MessagesPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [cases, setCases] = useState<MediationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [messagesRes, casesRes] = await Promise.all([
          fetch("/api/messages"),
          fetch("/api/cases"),
        ]);

        if (!messagesRes.ok) {
          throw new Error("Failed to load messages");
        }
        if (!casesRes.ok) {
          throw new Error("Failed to load cases");
        }

        const messagesJson = (await messagesRes.json()) as Message[];
        const casesJson = (await casesRes.json()) as MediationCase[];

        setMessages(messagesJson);
        setCases(casesJson);
      } catch (err: any) {
        console.error("Error loading messages:", err);
        setError(err?.message ?? "Failed to load messages");
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return messages;

    return messages.filter((m) => {
      const haystack = (m.subject + " " + m.body).toLowerCase();
      return haystack.includes(q);
    });
  }, [messages, search]);

  function handleRowClick(id: string) {
    router.push(`/messages/${id}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Messages
          </h1>
          <p className="text-sm text-muted-foreground">
            Keep internal notes or message history linked to your cases.
          </p>
        </div>

        <Link
          href="/messages/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + New message
        </Link>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-muted-foreground">
          Messages are internal-only for now. Later we can connect email or
          SMS providers.
        </p>
        <div className="w-full md:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject or text…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium">Inbox</h2>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages yet. Start by creating a new message and linking it to
            a case.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((m) => {
              const c = m.caseId ? caseById.get(m.caseId) : undefined;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleRowClick(m.id)}
                  className="flex w-full flex-col gap-1 rounded-lg border bg-background p-3 text-left text-xs hover:bg-accent md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{m.subject}</p>
                    <p className="text-muted-foreground line-clamp-2">
                      {m.body}
                    </p>
                    {c && (
                      <p className="text-[11px] text-muted-foreground">
                        Case: {c.matter} ({c.caseNumber})
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-1 md:items-end">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(m.createdAt)}
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
