"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
// ⬇️ keep your existing imports below (UI components, API helpers, etc.)
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
// import { Database } from "@/lib/database.types";
// ...etc

export default function NewMessagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseIdFromQuery = searchParams.get("caseId"); // e.g. "/messages/new?caseId=123"

  // ⬇️ keep whatever other state you already had
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(""); // "" = No case linked

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [alsoSendEmail, setAlsoSendEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ⬇️ keep your existing effect that loads cases from Supabase / API
  // useEffect(() => { ...load cases... }, []);

  // NEW: sync dropdown selection with ?caseId=... once cases are loaded
  useEffect(() => {
    if (!caseIdFromQuery) return;
    if (!cases || cases.length === 0) return;

    setSelectedCaseId((current) => {
      if (current) return current; // don't override manual choice

      const match = cases.find((c) => c.id === caseIdFromQuery);
      return match ? match.id : "";
    });
  }, [caseIdFromQuery, cases]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        subject,
        body,
        caseId: selectedCaseId || null, // ✅ null = “no case linked”
        alsoSendEmail,
      };

      // ⬇️ keep your existing POST call here – only make sure it uses `payload`
      // const res = await fetch("/api/messages", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });

      // if (!res.ok) throw new Error("Failed to send message");

      // on success:
      setSubject("");
      setBody("");
      setAlsoSendEmail(false);
      router.push("/dashboard/messages");
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ⬇️ keep the rest of your component’s JSX, but update the dropdown + form to match below
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">New message</h1>
          <p className="text-sm text-gray-500">
            Log a message and optionally email it to the participants.
          </p>
        </div>
        <Link
          href="/dashboard/messages"
          className="text-sm text-indigo-600 hover:underline"
        >
          Back to messages
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Case dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Related case (optional)
          </label>
          <select
            name="caseId"
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">No case linked</option>
            {cases.map((caseItem) => (
              <option key={caseItem.id} value={caseItem.id}>
                {caseItem.caseNumber} — {caseItem.matter}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Also send email */}
        <div className="flex items-center gap-2">
          <input
            id="alsoSendEmail"
            type="checkbox"
            checked={alsoSendEmail}
            onChange={(e) => setAlsoSendEmail(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label
            htmlFor="alsoSendEmail"
            className="text-sm text-gray-700 select-none"
          >
            Also send this as an email
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : "Send message"}
          </button>
        </div>
      </form>
    </div>
  );
}
