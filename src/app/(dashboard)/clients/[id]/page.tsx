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
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to clients
        </Link>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Loading client…</p>
        </div>
      </div>
    );
  }

  if (clientError || !client) {
    return (
      <div className="space-y-4">
        <Link
          href="/clients"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to clients
        </Link>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-destructive">
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
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to clients
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {client.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Client profile and associated cases.
            </p>
          </div>
          <Link
            href="/cases/new"
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Add case for this client
          </Link>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="grid gap-4 md:grid-cols-3"
      >
        {/* Left: details & notes */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-medium">Client details</h2>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Notes</h2>
              <span className="text-[11px] text-muted-foreground">
                Internal notes about this client.
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Example: prefers early morning sessions; safety concerns; communication preferences…"
            />
          </div>

          {/* Associated cases */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Associated cases</h2>
              <span className="text-[11px] text-muted-foreground">
                Based on name match in case parties.
              </span>
            </div>

            {loadingCases ? (
              <p className="text-sm text-muted-foreground">
                Loading cases…
              </p>
            ) : casesError ? (
              <p className="text-sm text-destructive">{casesError}</p>
            ) : cases.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No cases found that mention this client by name.
              </p>
            ) : (
              <div className="space-y-2">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-1 rounded-md border bg-background p-2 text-xs md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">{c.matter}</p>
                      <p className="text-muted-foreground">
                        {c.caseNumber} • {c.parties}
                      </p>
                      <p className="text-muted-foreground">
                        {c.county} • Next session:{" "}
                        {formatDate(c.nextSessionDate)}
                      </p>
                    </div>
                    <Link
                      href={`/cases/${c.id}`}
                      className="mt-1 inline-flex rounded-md border px-3 py-1 text-[11px] font-medium hover:bg-accent md:mt-0"
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
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="w-full rounded-md border px-3 py-2 text-xs font-medium text-destructive hover:bg-accent/40"
            >
              Delete client
            </button>

            {saveError && (
              <p className="text-xs text-destructive">{saveError}</p>
            )}
            {saveSuccess && !saveError && (
              <p className="text-xs text-emerald-700">
                Client updated.
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground shadow-sm">
            <p className="font-medium mb-1">Tip</p>
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
