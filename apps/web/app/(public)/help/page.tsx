import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & FAQ | Festapp Rideshare",
  description:
    "Frequently asked questions about Festapp Rideshare. Get help with rides, bookings, safety, payments, and your account.",
};

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-900 select-none">
        {question}
      </summary>
      <div className="px-4 pb-3 text-sm text-gray-600 leading-relaxed">
        {answer}
      </div>
    </details>
  );
}

function FaqCategory({
  title,
  items,
}: {
  title: string;
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <FaqItem
            key={item.question}
            question={item.question}
            answer={item.answer}
          />
        ))}
      </div>
    </div>
  );
}

const faqData = [
  {
    title: "Getting Started",
    items: [
      {
        question: "How do I create an account?",
        answer:
          "Tap 'Sign Up' on the login page and enter your phone number or email address. You'll receive a verification code to confirm your identity. Once verified, you can set up your profile and start using the app.",
      },
      {
        question: "How do I post a ride?",
        answer:
          "Go to the search page and tap the '+' button, or use the 'Post a Ride' option. Enter your origin, destination, departure date and time, number of available seats, and an optional price. Your ride will be visible to other users searching for similar routes.",
      },
      {
        question: "How do I find a ride?",
        answer:
          "Use the search page to enter your origin and destination. You can filter results by date, price, and number of seats. Matching rides will appear based on route proximity, so even rides with nearby pickup points will show up.",
      },
    ],
  },
  {
    title: "Booking",
    items: [
      {
        question: "How does instant booking work?",
        answer:
          "When a driver enables instant booking, your booking is confirmed immediately when you tap 'Book'. No driver approval is needed. You'll receive a confirmation notification and can start chatting with the driver right away.",
      },
      {
        question: "How does request-and-approve booking work?",
        answer:
          "Some drivers prefer to review booking requests before confirming. When you request a seat, the driver receives a notification and can approve or decline. You'll be notified of their decision.",
      },
      {
        question: "How do I cancel a booking?",
        answer:
          "Open the ride details page and tap 'Cancel Booking'. Please cancel as early as possible to give the driver time to find another passenger. Frequent last-minute cancellations may affect your reliability score.",
      },
    ],
  },
  {
    title: "Safety",
    items: [
      {
        question: "How is the platform safe?",
        answer:
          "We verify user phone numbers and offer optional ID verification. Every ride includes ratings and reviews, so you can check a user's reputation before traveling together. You can also report or block users who behave inappropriately.",
      },
      {
        question: "What are verification badges?",
        answer:
          "Verification badges show that a user has completed identity checks. A 'Phone Verified' badge means their phone number is confirmed. An 'ID Verified' badge means they've uploaded an official identification document.",
      },
      {
        question: "How do I report a user?",
        answer:
          "Visit the user's profile and tap the three-dot menu in the top right. Select 'Report' and describe the issue. Our moderation team reviews all reports and takes appropriate action.",
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        question: "Is the platform free?",
        answer:
          "Yes, Festapp Rideshare is completely free to use. We do not charge any commissions or fees. Prices shown on rides are voluntary cost-sharing suggestions for fuel and tolls.",
      },
      {
        question: "How are prices calculated?",
        answer:
          "Drivers set their own prices as suggested contributions for fuel costs. Prices are not mandatory and are meant only to share the cost of the journey, not for profit.",
      },
      {
        question: "How do I pay the driver?",
        answer:
          "Payment is arranged directly between you and the driver, typically in cash at the end of the ride. The platform does not process payments. The suggested price is just a guideline for fair cost sharing.",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        question: "How do I edit my profile?",
        answer:
          "Go to your Profile page and tap the 'Edit' button. You can update your display name, bio, avatar photo, and social links. Tap 'Save changes' when you're done.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Go to Settings > Delete Account. This will permanently remove your profile, ride history, messages, and all associated data. This action cannot be undone.",
      },
      {
        question: "How do I export my data?",
        answer:
          "Go to Settings > Export My Data. You'll receive a downloadable file containing all your personal data stored on the platform, in compliance with GDPR data portability requirements.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Help & FAQ</h1>
      <p className="mb-8 text-gray-600">
        Find answers to the most common questions about Festapp Rideshare.
      </p>

      {faqData.map((category) => (
        <FaqCategory
          key={category.title}
          title={category.title}
          items={category.items}
        />
      ))}

      {/* Contact section */}
      <div className="mt-12 rounded-xl border border-gray-200 bg-white p-6 text-center">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Still have questions?
        </h2>
        <p className="text-sm text-gray-600">
          Email us at{" "}
          <a
            href="mailto:support@rideshare.festapp.com"
            className="font-medium text-gray-900 underline hover:no-underline"
          >
            support@rideshare.festapp.com
          </a>
        </p>
      </div>
    </div>
  );
}
