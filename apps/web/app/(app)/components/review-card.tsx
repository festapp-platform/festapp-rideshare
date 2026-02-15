"use client";

import { formatDistanceToNow, parseISO } from "date-fns";

/**
 * Individual review card for the profile page review list.
 *
 * Displays reviewer avatar, name, star rating, comment text, and relative date.
 * Compact card style matching the app's pastel design.
 */

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

interface ReviewCardProps {
  review: ReviewData;
}

const starPath =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

export function ReviewCard({ review }: ReviewCardProps) {
  const reviewer = review.reviewer;
  const displayName = reviewer?.display_name ?? "User";
  const initial = displayName.charAt(0).toUpperCase();
  const relativeDate = formatDistanceToNow(parseISO(review.created_at), {
    addSuffix: true,
  });

  return (
    <div className="rounded-xl border border-border-pastel bg-surface p-4">
      <div className="flex items-start gap-3">
        {/* Reviewer avatar */}
        {reviewer?.avatar_url ? (
          <img
            src={reviewer.avatar_url}
            alt={displayName}
            className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {initial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Name and date */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-text-main">
              {displayName}
            </span>
            <span className="flex-shrink-0 text-xs text-text-secondary">
              {relativeDate}
            </span>
          </div>

          {/* Star rating */}
          <div className="mt-0.5 flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`h-3.5 w-3.5 ${
                  star <= review.rating
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

          {/* Comment */}
          {review.comment && (
            <p className="mt-2 text-sm text-text-secondary">
              {review.comment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
