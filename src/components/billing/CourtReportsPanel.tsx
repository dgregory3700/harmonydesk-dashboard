"use client";

import { useEffect, useMemo, useState } from "react";

type CountyReportFormat =
  | "csv_line_per_invoice"
  | "pdf_line_per_invoice"
  | "pdf_grouped_by_case";

type County = {
  id: string;
  name: string;
  reportFormat: CountyReportFormat;
};

function formatLabel(f: CountyReportFormat): "CSV" | "PDF" {
  return f === "csv_line_per_invoice" ? "CSV" : "PDF";
}

function fileExt(f: CountyReportFormat): "csv" | "pdf" {
  return f === "csv_line_per_invoice" ? "csv" : "pdf";
}

export function CourtReportsPanel() {
  const [counties, setCounties] = useState<County[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, County>();
    counties.forEach((c) => m.set(c.id, c));
    return m;
  }, [counties]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/counties", { method: "GET" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load counties");
        }

        const data = (await res.json()) as County[];
        setCounties(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load counties");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function previewExport(countyId: string) {
    const county = byId.get(countyId);
    if (!county) return;

    try {
      setExportingId(countyId);

      // Deterministic server truth: export format is derived from county.report_format.
      // Do NOT pass ?format=... (avoids enum drift / regressions).
      const res = await fetch(
        `/api/counties/${encodeURIComponent(countyId)}/export`,
        { method: "GET" }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate preview");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const ext = fileExt(county.reportFormat);
      const safeName = county.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}-preview.${ext}`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Preview failed");
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-semibold text-slate-200 mb-2">
        County court reporting
      </h2>

      <p className="text-[11px] text-slate-400 mb-3">
        Reports are generated deterministically from Sent invoices by county.
      </p>

      {loading && <p className="text-xs text-slate-500">Loading counties…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {!loading && !error && counties.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3 text-xs text-slate-400">
          No counties configured yet. Add counties in Settings.
        </div>
      )}

      <div className="space-y-2">
        {counties.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs"
          >
            <p className="font-medium text-slate-200">{c.name}</p>

            <p className="text-[11px] text-slate-500">
              Format: {formatLabel(c.reportFormat)}
              {c.reportFormat === "pdf_grouped_by_case" ? " (grouped by case)" : ""}
            </p>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Export includes Sent invoices only.
              </span>

              <button
                type="button"
                onClick={() => previewExport(c.id)}
                disabled={exportingId === c.id}
                className="text-[11px] rounded-full border border-slate-700 px-2 py-1 text-sky-400 hover:bg-slate-900 hover:text-sky-300 transition-colors disabled:opacity-60"
              >
                {exportingId === c.id ? "Generating…" : "Preview"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
