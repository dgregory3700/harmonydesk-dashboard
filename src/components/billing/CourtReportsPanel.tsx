// src/components/billing/CourtReportsPanel.tsx

const counties = [
  {
    id: "king-wa",
    name: "King County Superior Court",
    format: "Summary by case (hours + outcome)",
    nextDue: "End of month",
  },
  {
    id: "pierce-wa",
    name: "Pierce County District Court",
    format: "One line per session",
    nextDue: "15th of next month",
  },
  {
    id: "snohomish-wa",
    name: "Snohomish County Superior Court",
    format: "Grouped by case with totals",
    nextDue: "End of quarter",
  },
];

export function CourtReportsPanel() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-semibold text-slate-200 mb-2">
        County court reporting
      </h2>
      <p className="text-[11px] text-slate-400 mb-3">
        Different counties, different formats. HarmonyDesk will generate the
        correct layout for each one from your case data.
      </p>

      <div className="space-y-2">
        {counties.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs"
          >
            <p className="font-medium text-slate-200">{c.name}</p>
            <p className="text-[11px] text-slate-500">{c.format}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Next report: {c.nextDue}
              </span>
              <button className="text-[11px] rounded-full border border-slate-700 px-2 py-0.5 text-sky-400 hover:bg-slate-900 hover:text-sky-300 transition-colors">
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
