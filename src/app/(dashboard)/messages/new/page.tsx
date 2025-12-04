// src/app/(dashboard)/messages/new/page.tsx
import { Suspense } from "react";
import MessagesNewClient from "./MessagesNewClient";

export default function NewMessagePage() {
  return (
    <Suspense fallback={<div>Loading message creator...</div>}>
      <MessagesNewClient />
    </Suspense>
  );
}
