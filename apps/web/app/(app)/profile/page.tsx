import Link from "next/link";

/**
 * Profile page placeholder (NAV-05).
 * Shows user info placeholder and link to settings (NAV-06).
 * Will show full profile in Phase 2.
 */
export default function ProfilePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Profile</h1>

      {/* User info placeholder */}
      <div className="mb-6 flex flex-col items-center rounded-2xl border border-border-pastel bg-surface p-8">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
          <svg
            className="h-10 w-10 text-surface"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text-main">Your Profile</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Profile details will appear here
        </p>
      </div>

      {/* Settings link */}
      <Link
        href="/settings"
        className="flex items-center justify-between rounded-xl border border-border-pastel bg-surface px-4 py-3 transition-colors hover:bg-primary/5"
      >
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-text-main">Settings</span>
        </div>
        <svg
          className="h-4 w-4 text-text-secondary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>
    </div>
  );
}
