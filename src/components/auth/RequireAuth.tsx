"use client";

import { ReactNode } from "react";

/**
 * Legacy component kept to avoid breaking imports.
 * Auth gating is enforced server-side by middleware + (dashboard)/layout.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
