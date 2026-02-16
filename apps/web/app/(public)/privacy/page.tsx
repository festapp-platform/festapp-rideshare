import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Festapp Rideshare",
  description:
    "Privacy policy for Festapp Rideshare. Learn how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-lg mx-auto max-w-3xl px-4 py-12">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-gray-500">Last updated: February 2026</p>

      <h2>1. What Data We Collect</h2>
      <p>We collect the following types of information:</p>
      <ul>
        <li>
          <strong>Profile information:</strong> Display name, bio, avatar photo,
          social links, and ID documents (when provided for verification).
        </li>
        <li>
          <strong>Ride history:</strong> Rides you have posted or booked,
          including origin, destination, date, and price.
        </li>
        <li>
          <strong>Chat messages:</strong> Messages exchanged between ride
          participants.
        </li>
        <li>
          <strong>Location data:</strong> Your location when you choose to share
          it during a ride (live location sharing is opt-in).
        </li>
        <li>
          <strong>Device information:</strong> Browser type, operating system,
          and device identifiers for push notifications.
        </li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li>Matching drivers and passengers for shared rides.</li>
        <li>
          Sending notifications about ride updates, messages, and reminders.
        </li>
        <li>Improving the platform experience and fixing issues.</li>
        <li>Calculating community impact statistics (CO2 savings).</li>
      </ul>

      <h2>3. Data Sharing</h2>
      <p>
        We do not sell your personal data. Information is shared only with ride
        participants as needed to facilitate rides (e.g., your display name and
        pickup location are visible to your ride companions).
      </p>

      <h2>4. Data Storage</h2>
      <p>
        Your data is hosted on Supabase (AWS eu-central-1, Frankfurt). All data
        is encrypted at rest and in transit using industry-standard encryption
        protocols.
      </p>

      <h2>5. Cookies</h2>
      <ul>
        <li>
          <strong>Authentication cookies:</strong> Necessary for keeping you
          signed in. These cannot be disabled.
        </li>
        <li>
          <strong>Analytics cookies:</strong> Optional, consent-based cookies
          used to understand how the platform is used. You can opt out at any
          time from Settings.
        </li>
      </ul>

      <h2>6. Your Rights (GDPR)</h2>
      <p>Under the General Data Protection Regulation, you have the right to:</p>
      <ul>
        <li>
          <strong>Access:</strong> Request a copy of your personal data.
        </li>
        <li>
          <strong>Rectification:</strong> Correct inaccurate or incomplete data.
        </li>
        <li>
          <strong>Erasure:</strong> Request deletion of your personal data.
        </li>
        <li>
          <strong>Data portability:</strong> Receive your data in a
          machine-readable format.
        </li>
        <li>
          <strong>Objection:</strong> Object to processing of your data for
          certain purposes.
        </li>
      </ul>

      <h2>7. Data Export</h2>
      <p>
        You can export a copy of your personal data at any time from{" "}
        <a href="/settings/data-export">Settings &gt; Export My Data</a>.
      </p>

      <h2>8. Data Deletion</h2>
      <p>
        You can delete your account and all associated data from{" "}
        <a href="/settings">Settings &gt; Delete Account</a>. Account deletion
        is permanent and cannot be undone.
      </p>

      <h2>9. Third-Party Services</h2>
      <p>We use the following third-party services:</p>
      <ul>
        <li>
          <strong>Supabase:</strong> Database and authentication hosting.
        </li>
        <li>
          <strong>OneSignal:</strong> Push notification delivery.
        </li>
        <li>
          <strong>Sentry:</strong> Error tracking and crash reporting.
        </li>
        <li>
          <strong>Google Maps:</strong> Route calculation and map display.
        </li>
      </ul>

      <h2>10. Children</h2>
      <p>
        Festapp Rideshare is not intended for users under 18 years of age. We do
        not knowingly collect personal data from children. If you believe a child
        has provided us with personal data, please contact us so we can remove
        it.
      </p>

      <h2>11. Contact</h2>
      <p>
        For questions about this Privacy Policy or to exercise your data rights,
        contact our data protection team at{" "}
        <a href="mailto:privacy@rideshare.festapp.com">
          privacy@rideshare.festapp.com
        </a>
        .
      </p>
    </article>
  );
}
