//src/app/(dashboard)/booking-links/page.tsx
"use client";

import React from "react";

type BookingLink = {
  id: string;
  label: string;
  description: string;
  slug: string;
  defaultDuration: string;
};

const BOOKING_LINKS: BookingLink[] = [
  {
    id: "intro",
    label: "Intro call",
    description: "Short intro call (placeholder — not active yet).",
    slug: "intro",
    defaultDuration: "15 min",
  },
  {
    id: "full",
    label: "Full session",
    description: "Standard mediation session (placeholder — not active yet).",
    slug: "session",
    defaultDuration: "60 min",
  },
];

export default function BookingLinksPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
        <div className="text-sm font-semibold">Booking links are not active</div>
        <div className="mt-1 text-sm text-amber-200/80">
          This page is an internal placeholder. HarmonyDesk does not currently ship a
          public booking flow, and no booking URLs are generated.
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-100">Booking links</h2>
        <p className="mt-1 text-sm text-slate-400">
          Draft-only placeholders. No public booking pages exist yet.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {BOOKING_LINKS.map((link) => (
          <div
            key={link.id}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  {link.label}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Default duration: {link.defaultDuration}
                </div>
              </div>

              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                Placeholder
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-400">{link.description}</p>

            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-500">Booking URL</div>
              <div className="mt-1 text-sm text-slate-300">
                Not active yet
                <span className="ml-2 text-xs text-slate-500">
                  (slug: {link.slug})
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-400 opacity-60"
                title="Disabled: booking pages are not active yet."
              >
                Copy link
              </button>
              <button
                type="button"
                disabled
                className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-400 opacity-60"
                title="Disabled: coming soon."
              >
                Preview (coming soon)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
