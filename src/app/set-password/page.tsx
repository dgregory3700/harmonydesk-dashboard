import { Suspense } from "react";
import SetPasswordClient from "./SetPasswordClient";

// Force this route to be dynamic so Next won't try to prerender it
export const dynamic = "force-dynamic";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <SetPasswordClient />
    </Suspense>
  );
}
