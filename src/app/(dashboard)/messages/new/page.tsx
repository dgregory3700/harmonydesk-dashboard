// src/app/(dashboard)/messages/new/page.tsx
"use client";

import { Suspense } from "react";
import MessagesNewClient from "./MessagesNewClient";

export default function NewMessagePage() {
  return (
    <Suspense
      fallback={<div className="space-y-6 text-sm text-slate-400">Loading…</div>}
    >
      <MessagesNewClient />
    </Suspense>
  );
}
