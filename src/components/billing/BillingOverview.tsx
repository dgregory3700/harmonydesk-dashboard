"use client";

import React, { useEffect, useMemo, useState } from "react";

type InvoiceStatus = "Draft" | "Sent" | "For county report";

type Invoice = {
  id: string;
  caseNumber: string;
  matter: string;
  contact: string;
  hours: number;
  rate: number;
  status: InvoiceStatus;
  due: string;
  countyId: string | null;
};

type CountyReportFormat =
  | "csv_line_per_invoice"
  | "pdf_line_per_invoice"
  | "pdf_grouped_by_case";

type County = {
  id: string;
  name: string;
  reportFormat: CountyReportFormat;
};

type UserSettings = {
  defaultCountyId: string | null;
};

type NewInvoiceForm = {
  caseNumber: string;
  matter: string;
  contact: string;
  hours: string;
  rate: string;
};

type BannerState =
  | { kind: "success"; text: string; invoiceId?: string }
  | { kind: "error"; text: string; invoiceId?: string }
  | null;

function countyFormatLabel(f: CountyReportFormat): string {
  if (f === "csv_line_per_invoice") return "CSV";
  if (f === "pdf_line_per_invoice") return "PDF";
  return "PDF (grouped by case)";
}

function countyFileExt(f: CountyReportFormat): "csv" | "pdf" {
  return f === "csv_line_per_invoice" ? "csv" : "pdf";
}

export default function BillingOverview() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [counties, setCounties] = useState<County[]>([]);
  const [defaultCountyId, setDefaultCountyId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState<NewInvoiceForm>({
    caseNumber: "",
    matter: "",
    contact: "",
    hours: "",
    rate: "",
  });

  const [banner, setBanner] = useState<BannerState>(null);

  const [reportCountyId, setReportCountyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const countiesById = useMemo(() => {
    const map = new Map<string, County>();
    for (const c of counties) map.set(c.id, c);
    return map;
  }, [counties]);

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        setError(null);

        const [invRes, countyRes, settingsRes] = await Promise.all([
          fetch("/api/invoices", { method: "GET" }),
          fetch("/api/counties", { method: "GET" }),
          fetch("/api/user-settings", { method: "GET" }),
        ]);

        if (!invRes.ok) {
          const body = await invRes.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load invoices");
        }
        if (!countyRes.ok) {
          const body = await countyRes.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load counties");
        }
        if (!settingsRes.ok) {
          const body = await settingsRes.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load settings");
        }

        const invData = (await invRes.json()) as Invoice[];
        const countyData = (await countyRes.json()) as County[];
        const settings = (await settingsRes.json()) as UserSettings;

        setInvoices(invData);
        setCounties(countyData);
        setDefaultCountyId(settings.defaultCountyId ?? null);

        // initialize report selector deterministically
        const initialCounty =
          settings.defaultCountyId ??
          (countyData.length > 0 ? countyData[0].id : null);
        setReportCountyId(initialCounty);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load billing data");
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  const draftTotal = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status === "Draft")
        .reduce((sum, inv) => sum + inv.hours * inv.rate, 0),
    [invoices]
  );

  const sentForSelectedCounty = useMemo(() => {
    if (!reportCountyId) return [];
    return invoices.filter(
      (inv) => inv.status === "Sent" && inv.countyId === reportCountyId
    );
  }, [invoices, reportCountyId]);

  const reportTotals = useMemo(() => {
    return {
      count: sentForSelectedCounty.length,
      hours: sentForSelectedCounty.reduce((sum, inv) => sum + inv.hours, 0),
      amount: sentForSelectedCounty.reduce(
        (sum, inv) => sum + inv.hours * inv.rate,
        0
      ),
    };
  }, [sentForSelectedCounty]);

  function handleFormChange(field: keyof NewInvoiceForm, value: string) {
    setNewInvoice((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddInvoice(e: React.FormEvent) {
    e.preventDefault();

    try {
      const hours = parseFloat(newInvoice.hours || "0");
      const rate = parseFloat(newInvoice.rate || "0");

      const body = {
        caseNumber: newInvoice.caseNumber.trim(),
        matter: newInvoice.matter.trim(),
        contact: newInvoice.contact.trim(),
        hours: Number.isNaN(hours) ? 0 : hours,
        rate: Number.isNaN(rate) ? 0 : rate,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create invoice");
      }

      const created = (await res.json()) as Invoice;

      // If user has a default county, apply it immediately (deterministic convenience)
      if (defaultCountyId) {
        const patch = await fetch(`/api/invoices/${created.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ countyId: defaultCountyId }),
        });
        if (patch.ok) {
          const updated = (await patch.json()) as Invoice;
          setInvoices((prev) => [updated, ...prev]);
        } else {
          setInvoices((prev) => [created, ...prev]);
        }
      } else {
        setInvoices((prev) => [created, ...prev]);
      }

      setNewInvoice({
        caseNumber: "",
        matter: "",
        contact: "",
        hours: "",
        rate: "",
      });
      setFormOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Could not create invoice");
    }
  }

  async function handleStatusChange(id: string, status: InvoiceStatus) {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update invoice");
      }

      const updated = (await res.json()) as Invoice;
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Could not update invoice");
    }
  }

  async function handleCountyChange(invoiceId: string, countyId: string | null) {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countyId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update invoice county");
      }

      const updated = (await res.json()) as Invoice;
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? updated : inv))
      );
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Could not update invoice county");
    }
  }

  async function handleDeleteInvoice(id: string) {
    const confirmed = window.confirm(
      "Delete this invoice? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete invoice");
      }

      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Could not delete invoice");
    }
  }

  function describeInvoice(inv: Invoice) {
    const total = inv.hours * inv.rate;
    const countyName = inv.countyId
      ? countiesById.get(inv.countyId)?.name || "Unknown county"
      : "Unassigned";

    return [
      `Case: ${inv.caseNumber}`,
      `Matter: ${inv.matter}`,
      `Bill to: ${inv.contact}`,
      `County: ${countyName}`,
      `Hours: ${inv.hours.toFixed(2)}`,
      `Rate: $${inv.rate.toFixed(2)}`,
      `Total: $${total.toFixed(2)}`,
    ].join("\n");
  }

  function extractErrorMessage(body: any): string {
    if (!body) return "Failed to send invoice.";
    if (typeof body.message === "string" && body.message.trim())
      return body.message.trim();
    if (typeof body.error === "string" && body.error.trim())
      return body.error.trim();
    return "Failed to send invoice.";
  }

  async function handlePrepareAndSend(inv: Invoice) {
    setBanner(null);

    const ok = window.confirm(
      [
        "Please double-check this invoice before emailing it:",
        "",
        describeInvoice(inv),
        "",
        "Click OK to send this invoice by email.",
      ].join("\n")
    );

    if (!ok) return;

    try {
      const toEmail = window.prompt("Send invoice to which email address?", "");
      if (!toEmail || !toEmail.trim()) return;

      const res = await fetch(`/api/invoices/${inv.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: toEmail.trim() }),
      });

      // If server returns non-JSON, we still want a clean error.
      const bodyJson = await res
        .json()
        .catch(() => ({ error: "Invalid server response" }));

      if (!res.ok) {
        const msg = extractErrorMessage(bodyJson);
        setBanner({
          kind: "error",
          invoiceId: inv.id,
          text: `Send failed: ${msg}`,
        });
        return;
      }

      // Success shapes we tolerate:
      // - { invoice: {...}, email: {...} }
      // - { ...invoiceFields }
      const updatedInvoice = (bodyJson?.invoice ?? bodyJson) as Invoice;

      // If server didn't echo a full invoice, fall back to optimistic status update.
      const safeInvoice: Invoice =
        updatedInvoice && typeof updatedInvoice.id === "string"
          ? updatedInvoice
          : { ...inv, status: "Sent" };

      setInvoices((prev) =>
        prev.map((invoice) => (invoice.id === inv.id ? safeInvoice : invoice))
      );

      setBanner({
        kind: "success",
        invoiceId: inv.id,
        text: "Invoice email sent successfully.",
      });
    } catch (err: any) {
      console.error(err);
      setBanner({
        kind: "error",
        invoiceId: inv.id,
        text: err?.message ? `Send failed: ${String(err.message)}` : "Send failed.",
      });
    }
  }

  // Deterministic export: server derives format from county.report_format and filters Sent invoices.
  async function exportCountyReport(countyId: string) {
    const county = countiesById.get(countyId);
    if (!county) return;

    try {
      setExporting(true);

      const res = await fetch(
        `/api/counties/${encodeURIComponent(countyId)}/export`,
        { method: "GET" }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to export report");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const ext = countyFileExt(county.reportFormat);
      const safeName = county.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}-month-end-report.${ext}`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  function StatusBadge({ status }: { status: InvoiceStatus }) {
    if (status === "Sent") {
      return (
        <span className="inline-flex items-center rounded-md border border-emerald-800 bg-emerald-900/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
          Sent
        </span>
      );
    }
    if (status === "Draft") {
      return (
        <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/40 px-2 py-0.5 text-[11px] font-medium text-slate-300">
          Draft
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/40 px-2 py-0.5 text-[11px] font-medium text-slate-300">
        For county report
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Client billing
          </h1>
          <p className="text-sm text-slate-400">
            Track invoices and generate county reports from Sent invoices.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Draft total</p>
          <p className="text-xl font-semibold text-slate-100">
            ${draftTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {banner && (
        <div
          className={[
            "rounded-xl border p-4 shadow-sm",
            banner.kind === "success"
              ? "border-emerald-800 bg-emerald-900/20"
              : "border-red-800 bg-red-900/20",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className={[
                  "text-sm font-semibold",
                  banner.kind === "success" ? "text-emerald-200" : "text-red-200",
                ].join(" ")}
              >
                {banner.kind === "success" ? "Sent" : "Send failed"}
              </p>
              <p
                className={[
                  "mt-1 text-sm",
                  banner.kind === "success"
                    ? "text-emerald-100/90"
                    : "text-red-100/90",
                ].join(" ")}
              >
                {banner.text}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* New invoice */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-200">New invoice</h2>
          <button
            type="button"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            onClick={() => setFormOpen((v) => !v)}
          >
            {formOpen ? "Close form" : "New invoice"}
          </button>
        </div>

        {formOpen && (
          <form
            onSubmit={handleAddInvoice}
            className="mt-4 grid gap-3 md:grid-cols-5"
          >
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Case number
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 text-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-600"
                value={newInvoice.caseNumber}
                onChange={(e) => handleFormChange("caseNumber", e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Matter
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 text-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={newInvoice.matter}
                onChange={(e) => handleFormChange("matter", e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Bill to / contact
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 text-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={newInvoice.contact}
                onChange={(e) => handleFormChange("contact", e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="w-full rounded-md border border-slate-700 bg-slate-950 text-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={newInvoice.hours}
                onChange={(e) => handleFormChange("hours", e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Rate ($/hr)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full rounded-md border border-slate-700 bg-slate-950 text-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={newInvoice.rate}
                onChange={(e) => handleFormChange("rate", e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                className="inline-flex rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
              >
                Add invoice
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Invoice list */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-slate-300">Invoices</h2>

        {invoices.length === 0 && !loading ? (
          <p className="text-sm text-slate-500">
            No invoices yet. Use “New invoice” to create your first one.
          </p>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => {
              const total = inv.hours * inv.rate;
              const countyName = inv.countyId
                ? countiesById.get(inv.countyId)?.name || "Unknown county"
                : "Unassigned";

              return (
                <div
                  key={inv.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-200">
                        {inv.matter}
                      </p>
                      <StatusBadge status={inv.status} />
                    </div>

                    <p className="text-xs text-slate-400">
                      {inv.caseNumber} • {inv.contact}
                    </p>

                    <p className="text-xs text-slate-400">
                      County:{" "}
                      <span className="font-medium text-slate-200">
                        {countyName}
                      </span>
                    </p>

                    <p className="text-xs text-slate-400">
                      {inv.hours.toFixed(2)} hours @ ${inv.rate.toFixed(2)} •{" "}
                      <span className="font-medium text-slate-200">
                        ${total.toFixed(2)}
                      </span>
                    </p>

                    <p className="text-xs text-slate-500">{inv.due}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* County assignment */}
                    <select
                      className="rounded-md border border-slate-700 bg-slate-900 text-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      value={inv.countyId ?? ""}
                      onChange={(e) =>
                        handleCountyChange(inv.id, e.target.value || null)
                      }
                      title="Assign this invoice to a county"
                    >
                      <option value="">Unassigned</option>
                      {counties.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    {/* Status dropdown: Sent is NOT manually selectable */}
                    <select
                      className="rounded-md border border-slate-700 bg-slate-900 text-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      value={inv.status}
                      onChange={(e) =>
                        handleStatusChange(inv.id, e.target.value as InvoiceStatus)
                      }
                      disabled={inv.status === "Sent"}
                      title={
                        inv.status === "Sent"
                          ? "Sent invoices cannot be manually changed."
                          : undefined
                      }
                    >
                      <option value="Draft">Draft</option>
                      <option value="For county report">For county report</option>
                    </select>

                    <button
                      type="button"
                      className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                      onClick={() => {
                        if (inv.status === "Draft") {
                          handlePrepareAndSend(inv);
                        } else {
                          alert(describeInvoice(inv));
                        }
                      }}
                    >
                      {inv.status === "Draft" && "Prepare & send"}
                      {inv.status === "Sent" && "View invoice"}
                      {inv.status === "For county report" && "View"}
                    </button>

                    <button
                      type="button"
                      className="rounded-md border border-slate-700 bg-transparent px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-900/20 hover:border-red-800 transition-colors"
                      onClick={() => handleDeleteInvoice(inv.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* County month-end report (deterministic) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-200">
              County month-end report
            </h2>
            <p className="text-xs text-slate-400">
              Export is based on: invoices where county_id = selected AND status = Sent.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="rounded-md border border-slate-700 bg-slate-900 text-slate-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={reportCountyId ?? ""}
              onChange={(e) => setReportCountyId(e.target.value || null)}
              disabled={counties.length === 0}
              title="Select county for export"
            >
              {counties.length === 0 ? (
                <option value="">No counties configured</option>
              ) : (
                counties.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({countyFormatLabel(c.reportFormat)})
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-60"
              disabled={
                !reportCountyId ||
                counties.length === 0 ||
                exporting ||
                sentForSelectedCounty.length === 0
              }
              onClick={() => reportCountyId && exportCountyReport(reportCountyId)}
              title={
                sentForSelectedCounty.length === 0
                  ? "No Sent invoices for this county yet."
                  : "Download report"
              }
            >
              {exporting ? "Exporting…" : "Export"}
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-400">
          {reportCountyId ? (
            <>
              {reportTotals.count} sent invoices • {reportTotals.hours.toFixed(2)} hours • $
              {reportTotals.amount.toFixed(2)}
            </>
          ) : (
            <>Select a county to see totals.</>
          )}
        </div>
      </div>
    </div>
  );
}
