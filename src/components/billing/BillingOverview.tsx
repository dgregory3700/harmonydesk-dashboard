"use client";

import React, { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";

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
};

type NewInvoiceForm = {
  caseNumber: string;
  matter: string;
  contact: string;
  hours: string;
  rate: string;
};

export default function BillingOverview() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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

  // Load invoices from API (Supabase-backed)
  useEffect(() => {
    async function loadInvoices() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/invoices", { method: "GET" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load invoices");
        }
        const data = (await res.json()) as Invoice[];
        setInvoices(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    }
    loadInvoices();
  }, []);

  // Derived values
  const draftTotal = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status === "Draft")
        .reduce((sum, inv) => sum + inv.hours * inv.rate, 0),
    [invoices]
  );

  const countyInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === "For county report"),
    [invoices]
  );

  const countyTotals = useMemo(
    () => ({
      cases: countyInvoices.length,
      hours: countyInvoices.reduce((sum, inv) => sum + inv.hours, 0),
      amount: countyInvoices.reduce(
        (sum, inv) => sum + inv.hours * inv.rate,
        0
      ),
    }),
    [countyInvoices]
  );

  function handleFormChange(
    field: keyof NewInvoiceForm,
    value: string
  ) {
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
      setInvoices((prev) => [created, ...prev]);

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
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? updated : inv))
      );
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Could not update invoice");
    }
  }

  function downloadKingCountyCsv() {
    if (countyInvoices.length === 0) return;

    const header = ["Case Number", "Matter", "Bill To", "Hours", "Rate", "Total"];
    const rows = countyInvoices.map((inv) => [
      inv.caseNumber,
      inv.matter,
      inv.contact,
      inv.hours.toString(),
      inv.rate.toFixed(2),
      (inv.hours * inv.rate).toFixed(2),
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "king-county-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadPierceCountyPdf() {
    if (countyInvoices.length === 0) return;

    const doc = new jsPDF("landscape", "mm", "letter");
    const marginLeft = 10;
    let cursorY = 20;

    doc.setFontSize(14);
    doc.text(
      "Pierce County District Court - Month End Report",
      marginLeft,
      cursorY
    );

    cursorY += 8;
    doc.setFontSize(11);
    doc.text(
      `Total cases: ${countyTotals.cases}    Total hours: ${countyTotals.hours.toFixed(
        2
      )}    Total amount: $${countyTotals.amount.toFixed(2)}`,
      marginLeft,
      cursorY
    );

    cursorY += 10;

    // Table headers
    doc.setFontSize(10);
    doc.text("Case #", marginLeft, cursorY);
    doc.text("Matter", marginLeft + 40, cursorY);
    doc.text("Hours", marginLeft + 120, cursorY);
    doc.text("Total ($)", marginLeft + 150, cursorY);
    doc.text("Bill To", marginLeft + 190, cursorY);

    cursorY += 6;

    const maxY = 190;

    countyInvoices.forEach((inv) => {
      if (cursorY > maxY) {
        doc.addPage("letter", "landscape");
        cursorY = 20;

        doc.setFontSize(10);
        doc.text("Case #", marginLeft, cursorY);
        doc.text("Matter", marginLeft + 40, cursorY);
        doc.text("Hours", marginLeft + 120, cursorY);
        doc.text("Total ($)", marginLeft + 150, cursorY);
        doc.text("Bill To", marginLeft + 190, cursorY);

        cursorY += 6;
      }

      const total = inv.hours * inv.rate;
      const matterTrunc =
        inv.matter.length > 40
          ? inv.matter.slice(0, 37) + "..."
          : inv.matter;
      const contactTrunc =
        inv.contact.length > 30
          ? inv.contact.slice(0, 27) + "..."
          : inv.contact;

      doc.text(inv.caseNumber, marginLeft, cursorY);
      doc.text(matterTrunc, marginLeft + 40, cursorY);
      doc.text(inv.hours.toFixed(2), marginLeft + 120, cursorY);
      doc.text(total.toFixed(2), marginLeft + 150, cursorY);
      doc.text(contactTrunc, marginLeft + 190, cursorY);

      cursorY += 6;
    });

    doc.save("pierce-county-report.pdf");
  }

  return (
    <div className="space-y-6">
      {/* Header + Draft total */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Client billing
          </h1>
          <p className="text-sm text-muted-foreground">
            Track mediation sessions, invoices, and county reports.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Draft total</p>
          <p className="text-xl font-semibold">
            ${draftTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">
          Loading invoices…
        </p>
      )}
      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}

      {/* New invoice card */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">New invoice</h2>
          <button
            type="button"
            className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-accent"
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
              <label className="block text-xs font-medium mb-1">
                Case number
              </label>
              <input
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={newInvoice.caseNumber}
                onChange={(e) =>
                  handleFormChange("caseNumber", e.target.value)
                }
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">
                Matter
              </label>
              <input
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={newInvoice.matter}
                onChange={(e) =>
                  handleFormChange("matter", e.target.value)
                }
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">
                Bill to / contact
              </label>
              <input
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={newInvoice.contact}
                onChange={(e) =>
                  handleFormChange("contact", e.target.value)
                }
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={newInvoice.hours}
                onChange={(e) =>
                  handleFormChange("hours", e.target.value)
                }
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Rate ($/hr)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={newInvoice.rate}
                onChange={(e) =>
                  handleFormChange("rate", e.target.value)
                }
                required
              />
            </div>
            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Add invoice
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Invoice list */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-medium mb-3">Invoices</h2>
        {invoices.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">
            No invoices yet. Use “New invoice” to create your first one.
          </p>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => {
              const total = inv.hours * inv.rate;
              return (
                <div
                  key={inv.id}
                  className="flex flex-col gap-2 rounded-lg border bg-background p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{inv.matter}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.caseNumber} • {inv.contact}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.hours.toFixed(2)} hours @ ${inv.rate.toFixed(2)} •{" "}
                      <span className="font-medium">
                        ${total.toFixed(2)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.due}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-md border bg-white text-slate-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={inv.status}
                      onChange={(e) =>
                        handleStatusChange(
                          inv.id,
                          e.target.value as InvoiceStatus
                        )
                      }
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="For county report">
                        For county report
                      </option>
                    </select>
                    <button
                      type="button"
                      className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent"
                    >
                      {inv.status === "Draft" && "Prepare & send"}
                      {inv.status === "Sent" && "View invoice"}
                      {inv.status === "For county report" &&
                        "View for report"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* County month-end report */}
      {countyInvoices.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-medium">
                County month-end report preview
              </h2>
              <p className="text-xs text-muted-foreground">
                {countyTotals.cases} cases • {countyTotals.hours.toFixed(2)}{" "}
                hours • ${countyTotals.amount.toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent"
                onClick={downloadKingCountyCsv}
              >
                King County CSV
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent"
                onClick={downloadPierceCountyPdf}
              >
                Pierce County PDF
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2 py-1 font-medium">Case #</th>
                  <th className="px-2 py-1 font-medium">Matter</th>
                  <th className="px-2 py-1 font-medium">Bill to</th>
                  <th className="px-2 py-1 font-medium">Hours</th>
                  <th className="px-2 py-1 font-medium">Rate</th>
                  <th className="px-2 py-1 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {countyInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="px-2 py-1">{inv.caseNumber}</td>
                    <td className="px-2 py-1">{inv.matter}</td>
                    <td className="px-2 py-1">{inv.contact}</td>
                    <td className="px-2 py-1">
                      {inv.hours.toFixed(2)}
                    </td>
                    <td className="px-2 py-1">
                      ${inv.rate.toFixed(2)}
                    </td>
                    <td className="px-2 py-1">
                      ${(inv.hours * inv.rate).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
