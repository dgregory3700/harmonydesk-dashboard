// app/privacy/page.tsx  (App Router)
// or pages/privacy.tsx  (Pages Router — remove metadata export if needed)

import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | HarmonyDesk",
  description: "Privacy Policy for HarmonyDesk.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen px-4 py-12 mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold mb-6">HarmonyDesk Privacy Policy</h1>

      <p className="text-sm text-gray-500 mb-8">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section className="space-y-4 text-sm leading-relaxed text-gray-800">
        <p>
          This Privacy Policy explains how <strong>HarmonyDesk</strong> (&quot;HarmonyDesk&quot;,
          &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects information
          when you use our scheduling and case management platform and related services
          (collectively, the &quot;Service&quot;).
        </p>

        <h2 className="text-lg font-semibold mt-6">1. Information We Collect</h2>
        <p>We may collect the following types of information:</p>
        <ul className="list-disc list-inside">
          <li>
            <strong>Account Information:</strong> such as your name, email address,
            and password or login credentials (including when using magic link login).
          </li>
          <li>
            <strong>Workspace &amp; Settings:</strong> configuration details related
            to your HarmonyDesk workspace, such as timezone, availability settings,
            and other preferences.
          </li>
          <li>
            <strong>Calendar Data:</strong> if you connect external calendars (e.g.,
            Google Calendar), we may access limited event information in order to
            show your availability and scheduling information. We request only the
            scopes necessary to provide these features.
          </li>
          <li>
            <strong>Usage Data:</strong> log data such as IP address, browser type,
            pages visited, and timestamps, which we may use for security, diagnostics,
            and improving the Service.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">2. How We Use Information</h2>
        <p>We use the information we collect to:</p>
        <ul className="list-disc list-inside">
          <li>Provide, maintain, and improve the HarmonyDesk Service.</li>
          <li>Authenticate you and secure your account.</li>
          <li>Show your availability and schedule events based on your settings.</li>
          <li>Provide support and respond to your inquiries.</li>
          <li>Monitor usage, prevent abuse, and protect the Service.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">3. Calendar Integrations</h2>
        <p>
          When you connect a third-party calendar (such as Google Calendar), we use
          a secure integration and service account to read availability and event
          information as needed to provide scheduling features. We do not use your
          calendar data for advertising purposes.
        </p>

        <h2 className="text-lg font-semibold mt-6">4. Cookies &amp; Similar Technologies</h2>
        <p>
          We may use cookies or similar technologies to maintain sessions, keep you
          logged in, and understand how the Service is used. You can typically adjust
          cookie settings through your browser, but some features may not work
          properly if cookies are disabled.
        </p>

        <h2 className="text-lg font-semibold mt-6">5. Data Sharing</h2>
        <p>
          We do not sell your personal information. We may share information in the
          following limited ways:
        </p>
        <ul className="list-disc list-inside">
          <li>
            <strong>Service Providers:</strong> with trusted vendors who help us
            operate the Service (for example, hosting, email delivery, analytics),
            subject to appropriate safeguards.
          </li>
          <li>
            <strong>Legal Requirements:</strong> if we are required to do so by law
            or in response to valid legal requests.
          </li>
          <li>
            <strong>Business Transfers:</strong> if we undergo a merger, acquisition,
            or sale of assets, your information may be transferred as part of that
            transaction, subject to this Policy or an equivalent policy.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">6. Data Retention</h2>
        <p>
          We retain personal information for as long as necessary to provide the
          Service, comply with legal obligations, resolve disputes, and enforce
          our agreements. You may contact us if you have questions about data
          retention or deletion of your account.
        </p>

        <h2 className="text-lg font-semibold mt-6">7. Security</h2>
        <p>
          We implement reasonable technical and organizational measures to protect
          your information against unauthorized access, loss, or misuse. However,
          no system can be completely secure, and we cannot guarantee absolute
          security of your data.
        </p>

        <h2 className="text-lg font-semibold mt-6">8. Your Choices</h2>
        <p>
          You may update certain account information directly within HarmonyDesk.
          You may also request deletion of your account by contacting us, subject
          to any retention requirements we have under applicable law.
        </p>

        <h2 className="text-lg font-semibold mt-6">9. International Users</h2>
        <p>
          If you access HarmonyDesk from outside the country where our servers are
          located, your information may be processed in a country with different
          data protection laws than your own. We take steps to ensure appropriate
          safeguards are in place where required.
        </p>

        <h2 className="text-lg font-semibold mt-6">10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make material
          changes, we will provide notice, for example by updating the date at the
          top of this page or by sending a notification where appropriate.
        </p>

        <h2 className="text-lg font-semibold mt-6">11. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or our data practices,
          please contact us at{" "}
          <a href="mailto:contact@harmonydesk.ai" className="underline">
            contact@harmonydesk.ai
          </a>.
        </p>

        <p className="mt-8 text-xs text-gray-500">
          This Privacy Policy is provided for general informational purposes and
          does not constitute legal advice. You should consult with your own legal
          advisor to ensure that your use of HarmonyDesk complies with laws and
          regulations applicable to you and your clients.
        </p>

        <p className="mt-4 text-xs text-gray-500">
          For information about the terms under which we provide the Service,
          please also review our{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
