// src/components/dashboard/TodayPanel.tsx
export function TodayPanel() {
  const items = [
    {
      label: "Review intake forms",
      detail: "2 new clients completed their forms.",
    },
    {
      label: "Prepare agreements",
      detail: "Draft documents for Johnson / Lee.",
    },
    {
      label: "Follow-up emails",
      detail: "Send recap to Smith vs. Turner.",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-sm font-semibold text-slate-100 mb-3">
        Today at a glance
      </h2>
      <p className="text-[11px] text-slate-500 mb-3">
        This section will later sync with your calendar. For now, it&apos;s a
        quick checklist.
      </p>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="rounded-xl border border-slate-800/70 bg-slate-900 px-3 py-2"
          >
            <p className="text-xs font-medium text-slate-200">{item.label}</p>
            <p className="text-[11px] text-slate-400">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
