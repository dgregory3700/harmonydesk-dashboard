// app/terms/page.tsx  (App Router)
// or pages/terms.tsx  (Pages Router — remove metadata export if you use this there)

import Link from "next/link";

export const metadata = {
  title: "Terms of Service | HarmonyDesk",
  description: "Terms of Service for HarmonyDesk, a scheduling and case management tool.",
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen px-4 py-12 mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold mb-6">HarmonyDesk Terms of Service</h1>

      <p className="text-sm text-gray-500 mb-8">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section className="space-y-4 text-sm leading-relaxed text-gray-800">
        <p>
          Welcome to <strong>HarmonyDesk</strong> (&quot;HarmonyDesk&quot;, &quot;we&quot;, &quot;us&quot;,
          or &quot;our&quot;). HarmonyDesk is a software-as-a-service (SaaS) platform that helps
          professionals manage appointments, availability, and case-related information.
          By creating an account, accessing, or using HarmonyDesk, you agree to these
          Terms of Service (&quot;Terms&quot;).
        </p>

        <h2 className="text-lg font-semibold mt-6">1. Eligibility</h2>
        <p>
          You must be at least 18 years old and legally able to enter into a binding
          contract to use HarmonyDesk. By using the service, you represent that you
          meet these requirements and that you are using HarmonyDesk for lawful,
          professional purposes.
        </p>

        <h2 className="text-lg font-semibold mt-6">2. Accounts & Security</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account
          credentials and for all activity that occurs under your account. Notify
          us immediately if you suspect any unauthorized access or use of your account.
        </p>

        <h2 className="text-lg font-semibold mt-6">3. Subscriptions & Billing</h2>
        <p>
          HarmonyDesk is offered on a subscription basis. Depending on your plan,
          certain features (such as calendar integrations, exports, or other
          premium tools) may be available only to paid subscribers.
        </p>
        <ul className="list-disc list-inside">
          <li>Subscription charges are billed in advance on a recurring basis.</li>
          <li>You are responsible for providing accurate billing information.</li>
          <li>
            Unless otherwise stated, fees are non-refundable except where required
            by law.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">4. Acceptable Use</h2>
        <p>
          You agree not to misuse HarmonyDesk. This includes, but is not limited to:
        </p>
        <ul className="list-disc list-inside">
          <li>Attempting to access or modify data you do not own or control.</li>
          <li>Using the service for unlawful, harmful, or deceptive purposes.</li>
          <li>Interfering with or disrupting the integrity or performance of the service.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">5. Data & Privacy</h2>
        <p>
          Our collection and use of personal data is described in our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>.
          You are responsible for complying with any legal obligations that apply to
          your own clients or contacts (for example, providing your own privacy
          notices where required).
        </p>

        <h2 className="text-lg font-semibold mt-6">6. Third-Party Services</h2>
        <p>
          HarmonyDesk may integrate with third-party services such as Google Calendar.
          Your use of those services is governed by their own terms and policies.
          We are not responsible for third-party services or how they handle your data.
        </p>

        <h2 className="text-lg font-semibold mt-6">7. No Legal or Professional Advice</h2>
        <p>
          HarmonyDesk is a tool to help manage scheduling and information. It does not
          provide legal, mediation, or professional advice. Any decisions you make
          using the service are your own responsibility.
        </p>

        <h2 className="text-lg font-semibold mt-6">8. Service Changes & Availability</h2>
        <p>
          We may update, change, or discontinue features or the service as a whole
          from time to time. We will make reasonable efforts to avoid unexpected
          outages, but we do not guarantee uninterrupted availability.
        </p>

        <h2 className="text-lg font-semibold mt-6">9. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, HarmonyDesk and its owners will not
          be responsible for any indirect, incidental, consequential, or punitive
          damages arising out of or relating to your use of the service.
        </p>

        <h2 className="text-lg font-semibold mt-6">10. Termination</h2>
        <p>
          You may stop using HarmonyDesk at any time. We may suspend or terminate
          your access to the service if you violate these Terms or use the service in
          a way that creates risk or possible legal exposure for us or other users.
        </p>

        <h2 className="text-lg font-semibold mt-6">11. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material changes,
          we will provide notice, for example by updating the date at the top of
          this page or sending an email notification where appropriate. By continuing
          to use HarmonyDesk after changes become effective, you agree to the
          updated Terms.
        </p>

        <h2 className="text-lg font-semibold mt-6">12. Contact</h2>
        <p>
          If you have any questions about these Terms, please contact us at{" "}
          <a href="mailto:contact@harmonydesk.ai" className="underline">
            contact@harmonydesk.ai
          </a>.
        </p>

        <p className="mt-8 text-xs text-gray-500">
          This Terms of Service is provided for general informational purposes and
          does not constitute legal advice. You should consult with your own legal
          advisor to ensure compliance with laws and regulations applicable to you.
        </p>
      </section>
    </main>
  );
}
