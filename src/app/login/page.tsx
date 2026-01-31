import { Suspense } from "react";
import LoginClient from "./LoginClient";

// Force this route to be dynamic so Next won't try to prerender it
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginClient loadingOverride />}>
      <LoginClient />
    </Suspense>
  );
}
