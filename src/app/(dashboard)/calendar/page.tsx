"use client";

import { useState } from "react";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Nicely formatted month label, e.g. "December 2025"
  const monthLabel = selectedDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  function goToMonth(offset: number) {
    setSelectedDate((current) => {
      const d = new Date(current);
      d.setMonth(d.getMonth() + offset);
      return d;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          View and manage your mediation sessions, consults, and appointments.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToMonth(-1)}
            className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
          >
            Prev
          </button>

          <button
            onClick={() => setSelectedDate(new Date())}
            className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
          >
            Today
          </button>

          <button
            onClick={() => goToMonth(1)}
            className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
          >
            Next
          </button>
        </div>

        <p className="text-lg font-medium">{monthLabel}</p>

        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
          + New Session
        </button>
      </div>

      {/* Placeholder calendar grid */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-2 grid grid-cols-7 text-center text-sm font-medium text-muted-foreground">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div
              key={i}
              className="h-20 cursor-pointer rounded-md border p-2 text-xs hover:bg-accent"
            >
              <p className="font-medium">{i + 1}</p>

              {/* Example placeholder events */}
              {i === 2 && (
                <div className="mt-1 rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-800">
                  Mediation 10 AM
                </div>
              )}
              {i === 12 && (
                <div className="mt-1 rounded bg-green-100 px-1 py-0.5 text-[10px] text-green-800">
                  Consultation 1:30 PM
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
