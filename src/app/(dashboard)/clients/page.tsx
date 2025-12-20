"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClients() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/clients");
        if (!res.ok) {
          throw new Error("Failed to load clients");
        }

        const data = (await res.json()) as Client[];
        setClients(data);
      } catch (err: any) {
        console.error("Error loading clients:", err);
        setError(err?.message ?? "Failed to load clients");
      } finally {
        setLoading(false);
      }
    }

    loadClients();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((c) => {
      const haystack = (
        c.name +
        " " +
        (c.email ?? "") +
        " " +
        (c.phone ?? "")
      ).toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Clients
          </h1>
          <p className="text-sm text-slate-400">
            Keep track of the people and attorneys you work with.
          </p>
        </div>

        <Link
          href="/clients/new"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
        >
          + New client
        </Link>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-400">
          View and manage your client list.
        </p>
        <div className="w-full md:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
      </div>

      {/* Client list */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-slate-200">Client list</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Loading clients…</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">
            No clients yet. Start by adding your first client.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 md:flex-row md:items-center md:justify-between hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">{c.name}</p>
                  <p className="text-xs text-slate-400">
                    {c.email || "No email on file"}
                    {c.phone ? ` • ${c.phone}` : ""}
                  </p>
                  {c.notes && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {c.notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 text-xs">
                  <Link
                    href={`/clients/${c.id}`}
                    className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    View client
                  </Link>
                  <Link
                    href={`/cases/new`}
                    className="rounded-md border border-slate-700 bg-transparent px-3 py-1 font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  >
                    Add case
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
