"use client";

import React, { useMemo, useState } from "react";

type MessageStatus = "unread" | "read" | "needs-reply" | "archived";

type Message = {
  id: string;
  from: string;
  fromEmail: string;
  participants: string;
  caseTitle: string;
  caseNumber: string;
  preview: string;
  body: string;
  receivedAt: string; // e.g. "Today • 10:24 AM"
  status: MessageStatus;
};

const SAMPLE_MESSAGES: Message[] = [
  {
    id: "1",
    from: "Taylor Johnson",
    fromEmail: "taylor@example.com",
    participants: "Taylor Johnson • Morgan Lee",
    caseTitle: "Johnson vs. Lee – small claims",
    caseNumber: "HD-2025-002",
    preview: "Hi, I have a question about our next session…",
    body:
      "Hi Duel,\n\nI have a question about our next session. Do we need to bring any additional documents for the small-claims portion, or just the financial disclosures?\n\nThank you,\nTaylor",
    receivedAt: "Today • 10:24 AM",
    status: "needs-reply",
  },
  {
    id: "2",
    from: "Alex Smith",
    fromEmail: "alex@example.com",
    participants: "Alex Smith • Jamie Turner",
    caseTitle: "Smith vs. Turner – parenting plan",
    caseNumber: "HD-2025-001",
    preview: "Thank you for sending the draft agreement.",
    body:
      "Hi Duel,\n\nThank you for sending the draft agreement. I’ve reviewed it and added a couple of comments regarding the holiday schedule. Everything else looks good.\n\nBest,\nAlex",
    receivedAt: "Yesterday • 4:02 PM",
    status: "read",
  },
  {
    id: "3",
    from: "County Coordinator",
    fromEmail: "coordinator@kingcounty.gov",
    participants: "King County District Court",
    caseTitle: "Monthly report – King County",
    caseNumber: "ADMIN",
    preview: "Reminder: please submit your month-end mediation report…",
    body:
      "Dear provider,\n\nThis is a reminder to submit your month-end mediation report by the 5th business day of the following month.\n\nThank you,\nKing County District Court",
    receivedAt: "Mon • 9:15 AM",
    status: "unread",
  },
  {
    id: "4",
    from: "Acme Corp Legal",
    fromEmail: "legal@acmecorp.com",
    participants: "Acme Corp • Vendor LLC",
    caseTitle: "Acme Corp vs. Vendor – contract renegotiation",
    caseNumber: "HD-2025-004",
    preview: "We’ve attached the signed agreement for your records.",
    body:
      "Hi Duel,\n\nWe’ve attached the signed agreement for your records. Please let us know if you need anything else from our side.\n\nBest regards,\nAcme Corp Legal",
    receivedAt: "Last week",
    status: "archived",
  },
];

type FilterKey = "all" | "unread" | "needs-reply" | "archived";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "needs-reply", label: "Needs reply" },
  { key: "archived", label: "Archived" },
];

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>(SAMPLE_MESSAGES);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    SAMPLE_MESSAGES[0]?.id ?? null
  );
  const [search, setSearch] = useState("");

  const stats = useMemo(
    () => ({
      total: messages.length,
      unread: messages.filter((m) => m.status === "unread").length,
      needsReply: messages.filter((m) => m.status === "needs-reply").length,
    }),
    [messages]
  );

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (activeFilter === "unread" && m.status !== "unread") return false;
      if (activeFilter === "needs-reply" && m.status !== "needs-reply")
        return false;
      if (activeFilter === "archived" && m.status !== "archived") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = [
          m.from,
          m.fromEmail,
          m.caseTitle,
          m.caseNumber,
          m.preview,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [messages, activeFilter, search]);

  const selected =
    filteredMessages.find((m) => m.id === selectedId) ||
    filteredMessages[0] ||
    null;

  // When selecting a message, mark it as read
  function handleSelect(message: Message) {
    setSelectedId(message.id);
    if (message.status === "unread") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, status: "read" } : m
        )
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Messages
          </h1>
          <p className="text-sm text-muted-foreground">
            Keep track of client emails and county communication.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-right text-sm">
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">Unread</p>
            <p className="text-lg font-semibold">{stats.unread}</p>
          </div>
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Needs reply
            </p>
            <p className="text-lg font-semibold">{stats.needsReply}</p>
          </div>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Status:
          </span>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                activeFilter === f.key
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search by case, client, or email…"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Layout: list + detail */}
      <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
        {/* Conversation list */}
        <div className="border-r border-slate-200 pr-3">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Inbox
          </h2>
          {filteredMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages match your filters.
            </p>
          ) : (
            <ul className="space-y-1">
              {filteredMessages.map((m) => {
                const isSelected = selected?.id === m.id;
                const isUnread = m.status === "unread";
                const needsReply = m.status === "needs-reply";

                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(m)}
                      className={`flex w-full flex-col items-start rounded-lg border px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "border-sky-500 bg-sky-50"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span
                          className={`truncate text-sm ${
                            isUnread || needsReply
                              ? "font-semibold text-slate-900"
                              : "text-slate-800"
                          }`}
                        >
                          {m.from}
                        </span>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {m.receivedAt}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {m.caseTitle}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-700">
                        {m.preview}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {isUnread && (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                            Unread
                          </span>
                        )}
                        {needsReply && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            Needs reply
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Message detail */}
        <div className="pl-0 md:pl-3">
          {selected ? (
            <>
              <div className="mb-4 border-b border-slate-200 pb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {selected.caseNumber}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {selected.caseTitle}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Participants: {selected.participants}
                </p>
              </div>

              <div className="mb-4 space-y-1 text-sm">
                <p>
                  <span className="font-medium text-slate-800">
                    From:
                  </span>{" "}
                  {selected.from}{" "}
                  <span className="text-muted-foreground">
                    &lt;{selected.fromEmail}&gt;
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Received: {selected.receivedAt}
                </p>
              </div>

              <div className="rounded-lg border bg-background px-3 py-3 text-sm whitespace-pre-line">
                {selected.body}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="inline-flex rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
                >
                  Reply (open email)
                </button>
                <button
                  type="button"
                  className="inline-flex rounded-md border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() =>
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === selected.id
                          ? {
                              ...m,
                              status:
                                m.status === "archived"
                                  ? "read"
                                  : "archived",
                            }
                          : m
                      )
                    )
                  }
                >
                  {selected.status === "archived"
                    ? "Move out of archive"
                    : "Archive"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a message from the left to view details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
