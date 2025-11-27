// src/app/page.tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  // For now, always send visitors to the login screen.
  redirect("/login");
}
