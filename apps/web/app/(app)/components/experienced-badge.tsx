import { EXPERIENCED_BADGE_THRESHOLD } from "@festapp/shared";

/**
 * Experienced badge component.
 *
 * Shows an amber/gold "Experienced" pill badge when the user has completed
 * EXPERIENCED_BADGE_THRESHOLD (10) or more rides.
 * Returns null if the threshold is not met.
 */

interface ExperiencedBadgeProps {
  completedRidesCount: number;
}

export function ExperiencedBadge({
  completedRidesCount,
}: ExperiencedBadgeProps) {
  if (completedRidesCount < EXPERIENCED_BADGE_THRESHOLD) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
      Experienced
    </span>
  );
}
