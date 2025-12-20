"use client";

import React, { useEffect, useState } from "react";

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
    label: "Intro / intake call",
    description:
      "Short call to understand the situation, explain the process, and decide whether mediation is a good fit.",
    slug: "intro",
    defaultDuration: "30 min",
  },
  {
    id: "full",
    label: "Full mediation session",
    description:
      "Standard working session used once both parties have completed intake and signed the agreement.",
    slug: "session",
    defaultDuration: "90 min",
  },
];

export default function BookingLinksPage() {
  const [origin, setOrigin] = useState<string>("https://harmonydesk.ai");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Use the real origin when running in the browser (localhost or production)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  function fullUrl(link: BookingLink) {
    return `${origin}/booking/${link.slug}`;
  }

  async function handleCopy(link: BookingLink) {
    const url = fullUrl(link);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      alert("Sorry, your browser would not let us copy the link automatically.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Booking links
          </h1>
          <p className="text-sm text-slate-400">
            Share simple scheduling links with clients and referral partners.
          </p>
        </div>
      </div>

      {/* Links list */}
      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
        <div className="mb-2 flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <div>
            <h2 className="text-sm font-medium text-slate-200">
              Your active links
            </h2>
            <p className="text-xs text-slate-400">
              Copy and paste these anywhere: email signatures, website, or
              county referral forms.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {BOOKING_LINKS.map((link) => (
            <div
              key={link.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-200">
                    {link.label}
                  </h3>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {link.defaultDuration}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{link.description}</p>
                <p className="mt-1 text-xs font-mono text-sky-400 break-all">
                  {fullUrl(link)}
                </p>
              </div>

              <div className="flex items-center gap-2 md:flex-col md:items-end">
                <button
                  type="button"
                  onClick={() => handleCopy(link)}
                  className="inline-flex rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-sky-500 transition-colors"
                >
                  {copiedId === link.id ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  className="inline-flex rounded-md border border-slate-700 bg-transparent px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                  Preview (coming soon)
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Helper copy for your mediator / you */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-200">
          How to use these links
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>
            Add the{" "}
            <span className="font-medium text-slate-300">
              Intro / intake call
            </span>{" "}
            link to your website and email signature for new inquiries.
          </li>
          <li>
            Once both parties are ready, send the{" "}
            <span className="font-medium text-slate-300">
              Full mediation session
            </span>{" "}
            link so they can pick a time that works.
          </li>
          <li>
            Later, we can connect these to your real scheduling system (Google
            Calendar, Calendly, or a custom HarmonyDesk calendar).
          </li>
        </ul>
      </div>
    </div>
  );
}
