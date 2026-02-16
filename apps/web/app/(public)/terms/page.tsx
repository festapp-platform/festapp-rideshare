import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | spolujizda.online",
  description:
    "Terms of service for spolujizda.online, the free community carpooling platform.",
};

export default function TermsPage() {
  return (
    <article className="prose prose-lg mx-auto max-w-3xl px-4 py-12">
      <h1>Terms of Service</h1>
      <p className="text-sm text-gray-500">Last updated: February 2026</p>

      <h2>1. Introduction</h2>
      <p>
        spolujizda.online is a free carpooling platform that connects drivers
        with empty seats to passengers heading in the same direction. By using
        spolujizda.online, you agree to these Terms of Service. If you do not
        agree, please do not use the platform.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old to use spolujizda.online. Drivers must
        hold a valid driver&apos;s license and have appropriate insurance for
        their vehicle. By creating an account, you confirm that you meet these
        requirements.
      </p>

      <h2>3. User Responsibilities</h2>
      <ul>
        <li>Provide accurate and up-to-date profile information.</li>
        <li>
          Drivers must maintain their vehicle in safe, roadworthy condition.
        </li>
        <li>
          All users must behave respectfully toward other members of the
          community.
        </li>
        <li>
          Users are responsible for complying with all applicable local traffic
          laws and regulations.
        </li>
      </ul>

      <h2>4. Ride Agreements</h2>
      <p>
        Rides arranged through spolujizda.online are agreements between the
        driver and passenger(s). The platform facilitates connections but is not
        a party to any ride agreement. We do not provide transportation services.
      </p>

      <h2>5. Cost Sharing</h2>
      <p>
        Prices displayed on the platform are suggested contributions for fuel
        cost sharing only. spolujizda.online is not a commercial transport
        service. Drivers should not profit from rides &mdash; cost sharing is
        intended to cover fuel and tolls only.
      </p>

      <h2>6. Cancellations</h2>
      <p>
        Users should cancel bookings with reasonable notice to avoid
        inconvenience. Repeated last-minute cancellations may affect your
        reliability score and standing on the platform.
      </p>

      <h2>7. Content and Conduct</h2>
      <p>
        The following are prohibited on spolujizda.online:
      </p>
      <ul>
        <li>Harassment, threats, or abusive behavior toward other users.</li>
        <li>Spam, fraudulent listings, or misleading information.</li>
        <li>Any illegal activity, including unlicensed commercial transport.</li>
        <li>
          Sharing content that is offensive, discriminatory, or violates the
          rights of others.
        </li>
      </ul>

      <h2>8. Privacy</h2>
      <p>
        Your privacy is important to us. Please review our{" "}
        <a href="/privacy">Privacy Policy</a> to understand how we collect, use,
        and protect your personal data.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        spolujizda.online provides the platform &ldquo;as is&rdquo; and does not
        guarantee the behavior, safety, or reliability of any user. The platform
        is not liable for any incidents, damages, or losses that occur during
        rides arranged through the service.
      </p>

      <h2>10. Changes to These Terms</h2>
      <p>
        We may update these Terms of Service from time to time. Continued use of
        spolujizda.online after changes are published constitutes acceptance of
        the updated terms. We will notify users of significant changes through
        the platform.
      </p>

      <h2>11. Contact</h2>
      <p>
        If you have questions about these Terms of Service, please contact us at{" "}
        <a href="mailto:support@rideshare.festapp.com">
          support@rideshare.festapp.com
        </a>
        .
      </p>
    </article>
  );
}
