"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

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

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = (params?.id as string) || "";

  const [client, setClient] = useState<Client | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cases associated (by name match for now)
  const [cases, setCases] = useState<MediationCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    async function loadClient() {
      try {
        setLoadingClient(true);
        setClientError(null);

        const res = await fetch(`/api/clients/${clientId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Client not found");
          }
          throw new Error("Failed to load client");
        }

        const data = (await res.json()) as Client;
        setClient(data);
        setName(data.name);
        setEmail(data.email ?? "");
        setPhone(data.phone ?? "");
        setNotes(data.notes ?? "");
      } catch (err: any) {
        console.error("Error loading client:", err);
        setClientError(err?.message ?? "Failed to load client");
      } finally {
        setLoadingClient(false);
      }
    }

    loadClient();
  }, [clientId]);

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

        // Simple association: any case whose "parties" string contains the client name
        if (client) {
          const filtered = data.filter((c) =>
            c.parties.toLowerCase().includes(client.name.toLowerCase())
          );
          setCases(filtered);
        } else {
          setCases([]);
        }
      } catch (err: any) {
        console.error("Error loading cases for client:", err);
        setCasesError(err?.message ?? "Failed to load cases");
      } finally {
        setLoadingCases(false);
      }
    }

    if (client) {
      loadCases();
    }
  }, [client]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!clientId || saving) return;

    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      if (!name.trim()) {
        setSaveError("Client name is required.");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to update client");
      }

      const updated = (await res.json()) as Client;
      setClient(updated);
      setSaveSuccess(true);
    } catch (err: any) {
      console.error("Error saving client:", err);
      setSaveError(err?.message ?? "Failed to save client");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!clientId) return;
    const confirmDelete = window.confirm(
      "Delete this client? This does not delete any cases."
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to delete client");
      }

      router.push("/clients");
    } catch (err: any) {
      console.error("Error deleting client:", err);
      setSaveError(err?.message ?? "Failed to delete client");
    }
  }

  if (loadingClient) {
    return (
      <div className="space-y-4">
        <Link
          href="/clients"
          className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
        >
          ← Back to clients
        </Link>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400">Loading client…</p>
        </div>
      </div>
    );
  }

  if (clientError || !client) {
    return (
      <div className="space-y-4">
        <Link
          href="/clients"
          className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
        >
          ← Back to clients
        </Link>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-red-400">
            {clientError || "Client not found."}
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
          href="/clients"
          className="text-xs text-slate-400 hover:text-slate-200 hover:underline transition-colors"
        >
          ← Back to clients
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
              {client.name}
            </h1>
            <p className="text-sm text-slate-400">
              Client profile and associated cases.
            </p>
          </div>
          <Link
            href="/cases/new"
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Add case for this client
          </Link>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-3">
        {/* Left: details & notes */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-medium text-slate-200">
              Client details
            </h2>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-200">Notes</h2>
              <span className="text-[11px] text-slate-500">
                Internal notes about this client.
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Example: prefers early morning sessions; safety concerns; communication preferences…"
            />
          </div>

          {/* Associated cases */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-200">
                Associated cases
              </h2>
              <span className="text-[11px] text-slate-500">
                Based on name match in case parties.
              </span>
            </div>

            {loadingCases ? (
              <p className="text-sm text-slate-500">Loading cases…</p>
            ) : casesError ? (
              <p className="text-sm text-red-400">{casesError}</p>
            ) : cases.length === 0 ? (
              <p className="text-sm text-slate-500">
                No cases found that mention this client by name.
              </p>
            ) : (
              <div className="space-y-2">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-1 rounded-md border border-slate-800 bg-slate-950 p-2 text-xs md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium text-slate-200">{c.matter}</p>
                      <p className="text-slate-400">
                        {c.caseNumber} • {c.parties}
                      </p>
                      <p className="text-slate-500">
                        {c.county} • Next session:{" "}
                        {formatDate(c.nextSessionDate)}
                      </p>
                    </div>
                    <Link
                      href={`/cases/${c.id}`}
                      className="mt-1 inline-flex rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white md:mt-0 transition-colors"
                    >
                      View case
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm space-y-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="w-full rounded-md border border-slate-700 bg-transparent px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/20 hover:border-red-800 transition-colors"
            >
              Delete client
            </button>

            {saveError && (
              <p className="text-xs text-red-400">{saveError}</p>
            )}
            {saveSuccess && !saveError && (
              <p className="text-xs text-emerald-400">Client updated.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-500 shadow-sm">
            <p className="font-medium mb-1 text-slate-400">Tip</p>
            <p>
              You can mention this client by name in case parties (e.g.
              &quot;{client.name} / Other Party&quot;) so their cases show up
              automatically here.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
