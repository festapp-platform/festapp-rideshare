"use client";

import { useI18n } from "@/lib/i18n/provider";

/**
 * Star rating display component.
 *
 * Renders filled/empty stars for a given rating value.
 * Used by ReviewCard, ride cards, and profile pages.
 *
 * - 'sm' format for ride cards: [star icon] 4.5 (12)
 * - 'md' format for profile: [5 stars filled/empty] 4.5 (12 ratings)
 * - When rating is null/0 and count is 0, shows localized "New" label
 */

interface StarRatingProps {
  rating: number | null;
  count?: number;
  size?: "sm" | "md";
}

const starPath =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

export function StarRating({ rating, count = 0, size = "sm" }: StarRatingProps) {
  const { t } = useI18n();

  // Show localized "New" label when no ratings exist
  if ((!rating || rating === 0) && count === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        {t("common.newUser")}
      </span>
    );
  }

  const displayRating = rating ?? 0;

  if (size === "sm") {
    return (
      <div className="flex items-center gap-1 text-xs text-text-secondary">
        <svg
          className="h-3.5 w-3.5 text-warning"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d={starPath} />
        </svg>
        <span>
          {displayRating.toFixed(1)}
          {count > 0 && <span className="ml-0.5">({count})</span>}
        </span>
      </div>
    );
  }

  // 'md' format: 5 individual stars + text
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`h-5 w-5 ${
              star <= Math.round(displayRating)
                ? "text-yellow-400"
                : "text-border-pastel"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d={starPath} />
          </svg>
        ))}
      </div>
      <span className="text-sm text-text-secondary">
        {displayRating.toFixed(1)} ({count}{" "}
        {count === 1 ? "rating" : "ratings"})
      </span>
    </div>
  );
}
