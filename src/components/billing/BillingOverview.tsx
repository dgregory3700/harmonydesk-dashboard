"use client";

import { useState, FormEvent, ChangeEvent } from "react";

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

const initialInvoices: Invoice[] = [
  {
    id: "1",
    caseNumber: "23-1045",
    matter: "Smith vs. Turner",
    contact: "Attorney Reed",
    hours: 3.5,
    rate: 250,
    status: "Draft",
    due: "Due in 5 days",
  },
  {
    id: "2",
    caseNumber: "23-1189",
    matter: "Johnson / Lee",
    contact: "Defendant (pro se)",
    hours: 2,
    rate: 200,
    status: "Sent",
    due: "Awaiting payment",
  },
  {
    id: "3",
    caseNumber: "23-0933",
    matter: "Anderson / Rivera",
    contact: "County voucher",
    hours: 4,
    rate: 0,
    status: "For county report",
    due: "Included in month-end",
  },
];

export function BillingOverview() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    caseNumber: "",
    matter: "",
    contact: "",
    hours: "",
    rate: "",
  });

  const totalDraftAmount = invoices
    .filter((inv) => inv.status === "Draft")
    .reduce((sum, inv) => sum + inv.hours * inv.rate, 0);

    const countyReportInvoices = invoices.filter(
    (inv) => inv.status === "For county report"
  );

  const totalCountyCases = countyReportInvoices.length;
  const totalCountyHours = countyReportInvoices.reduce(
    (sum, inv) => sum + inv.hours,
    0
  );
  const totalCountyAmount = countyReportInvoices.reduce(
    (sum, inv) => sum + inv.hours * inv.rate,
    0
  );
    function handleDownloadKingCountyCsv() {
    if (countyReportInvoices.length === 0) return;

    const header = [
      "Case Number",
      "Matter",
      "Bill To",
      "Hours",
      "Rate",
      "Total",
    ];

    const rows = countyReportInvoices.map((inv) => [
      inv.caseNumber,
      inv.matter,
      inv.contact,
      inv.hours.toString(),
      inv.rate.toString(),
      (inv.hours * inv.rate).toString(),
    ]);

    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "king-county-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }


  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const hours = parseFloat(form.hours || "0");
    const rate = parseFloat(form.rate || "0");

    if (!form.caseNumber.trim() || !form.matter.trim()) {
      return;
    }

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      caseNumber: form.caseNumber.trim(),
      matter: form.matter.trim(),
      contact: form.contact.trim() || "Unspecified",
      hours: isNaN(hours) ? 0 : hours,
      rate: isNaN(rate) ? 0 : rate,
      status: "Draft",
      due: "Draft – set due date",
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    setForm({
      caseNumber: "",
      matter: "",
      contact: "",
      hours: "",
      rate: "",
    });
    setShowForm(false);
  }

  function handleStatusChange(id: string, newStatus: InvoiceStatus) {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, status: newStatus } : inv
      )
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Client billing
          </h2>
          <p className="text-[11px] text-slate-500">
            Track billable hours, who is paying, and what still needs to be sent.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Draft amount:{" "}
            <span className="text-slate-100">
              ${totalDraftAmount.toLocaleString()}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-[11px] rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-900"
        >
          {showForm ? "Cancel" : "New invoice"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 space-y-2 text-xs"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-300">
                Case number
              </label>
              <input
                name="caseNumber"
                value={form.caseNumber}
                onChange={handleInputChange}
                required
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. 23-1045"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300">
                Matter
              </label>
              <input
                name="matter"
                value={form.matter}
                onChange={handleInputChange}
                required
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Smith vs. Turner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2">
              <label className="block text-[11px] text-slate-300">
                Bill to / contact
              </label>
              <input
                name="contact"
                value={form.contact}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Attorney, party, or county"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-300">
                  Hours
                </label>
                <input
                  name="hours"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.hours}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="3.5"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300">
                  Rate ($/hr)
                </label>
                <input
                  name="rate"
                  type="number"
                  step="1"
                  min="0"
                  value={form.rate}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="250"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm({
                  caseNumber: "",
                  matter: "",
                  contact: "",
                  hours: "",
                  rate: "",
                });
              }}
              className="text-[11px] rounded-full border border-slate-700 px-3 py-1 text-slate-300 hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-[11px] rounded-full bg-indigo-500 px-4 py-1 font-medium text-white hover:bg-indigo-400"
            >
              Save invoice
            </button>
          </div>
        </form>
      )}

            <div className="space-y-2">
        {invoices.map((inv) => {
          const amount = inv.hours * inv.rate;

          return (
            <div
              key={inv.id}
              className="rounded-xl border border-slate-800/70 bg-slate-900 px-3 py-2 flex items-start justify-between gap-3"
            >
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  {inv.matter}
                </p>
                <p className="text-[11px] text-slate-500">
                  Case #{inv.caseNumber} • {inv.contact}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {inv.hours} hrs @ ${inv.rate}/hr
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm font-semibold text-slate-50">
                  ${amount.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500">{inv.due}</p>

                <div className="flex items-center justify-end gap-2">
                  <select
                    value={inv.status}
                    onChange={(e) =>
                      handleStatusChange(
                        inv.id,
                        e.target.value as InvoiceStatus
                      )
                    }
                    className="text-[10px] rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="For county report">
                      For county report
                    </option>
                  </select>

                  <button className="text-[11px] rounded-full border border-slate-700 px-2 py-0.5 text-slate-200 hover:bg-slate-800">
                    {inv.status === "Draft"
                      ? "Prepare & send"
                      : inv.status === "Sent"
                      ? "View invoice"
                      : "View for report"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {countyReportInvoices.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-200">
                King County month-end report (draft)
              </p>
              <p className="text-[11px] text-slate-500">
                One line per case: hours and billable total. Export (PDF / CSV)
                will be added later.
              </p>
            </div>
            
            <div className="text-right text-[11px] text-slate-400">
              <p>Total cases: {totalCountyCases}</p>
              <p>Total hours: {totalCountyHours}</p>
              <p>
                Total amount: $
                {totalCountyAmount.toLocaleString()}
              </p>
              <button
                type="button"
                onClick={handleDownloadKingCountyCsv}
                className="mt-1 inline-flex items-center rounded-full border border-slate-700 px-3 py-0.5 text-[11px] text-slate-200 hover:bg-slate-900"
              >
                Download CSV
              </button>
            </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px] text-left border-t border-slate-800">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 pr-3">Case #</th>
                  <th className="py-1 pr-3">Matter</th>
                  <th className="py-1 pr-3">Bill to</th>
                  <th className="py-1 pr-3 text-right">Hours</th>
                  <th className="py-1 pr-3 text-right">Rate</th>
                  <th className="py-1 pr-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="text-slate-100">
                {countyReportInvoices.map((inv) => (
                  <tr
                    key={`report-${inv.id}`}
                    className="border-t border-slate-800"
                  >
                    <td className="py-1 pr-3">{inv.caseNumber}</td>
                    <td className="py-1 pr-3">{inv.matter}</td>
                    <td className="py-1 pr-3">{inv.contact}</td>
                    <td className="py-1 pr-3 text-right">{inv.hours}</td>
                    <td className="py-1 pr-3 text-right">
                      ${inv.rate}
                    </td>
                    <td className="py-1 pr-3 text-right">
                      {(inv.hours * inv.rate).toLocaleString()}
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



