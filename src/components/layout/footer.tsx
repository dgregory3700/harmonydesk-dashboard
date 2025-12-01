// components/Footer.tsx (example)

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t mt-16 py-6 text-xs text-gray-500">
      <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© {new Date().getFullYear()} HarmonyDesk. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <a href="mailto:contact@harmonydesk.ai" className="hover:underline">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
