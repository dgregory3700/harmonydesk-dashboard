// src/components/billing/BillingOverview.tsx

export function BillingOverview() {
  const invoices = [
    {
      caseNumber: "23-1045",
      matter: "Smith vs. Turner",
      contact: "Attorney Reed",
      hours: 3.5,
      rate: 250,
      status: "Draft",
      due: "Due in 5 days",
    },
    {
      caseNumber: "23-1189",
      matter: "Johnson / Lee",
      contact: "Defendant (pro se)",
      hours: 2,
      rate: 200,
      status: "Sent",
      due: "Awaiting payment",
    },
    {
      caseNumber: "23-0933",
      matter: "Anderson / Rivera",
      contact: "County voucher",
      hours: 4,
      rate: 0,
      status: "For county report",
      due: "Included in month-end",
    },
  ];

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
        </div>
        <button className="text-[11px] rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:bg-slate-900">
          New invoice
        </button>
      </div>

      <div className="space-y-2">
        {invoices.map((inv) => {
          const amount = inv.hours * inv.rate;

          return (
            <div
              key={inv.caseNumber}
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
                <button className="mt-1 text-[11px] rounded-full border border-slate-700 px-2 py-0.5 text-slate-200 hover:bg-slate-800">
                  {inv.status === "Draft" ? "Prepare & send" : "View"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
