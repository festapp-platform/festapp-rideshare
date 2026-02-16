"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { PendingReview } from "@festapp/shared";
import { useI18n } from "@/lib/i18n/provider";

/**
 * App-level pending rating detection banner.
 *
 * On mount, checks for pending reviews via get_pending_reviews RPC.
 * Shows a non-intrusive banner suggesting the user rate their completed rides.
 * Dismissable within the session (stored in localStorage).
 */

const DISMISS_KEY = "pending_ratings_dismissed";

export function PendingRatingBanner() {
  const { t } = useI18n();
  const supabase = createClient();
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [dismissed, setDismissed] = useState(true); // Start dismissed to avoid flash

  useEffect(() => {
    // Check if dismissed this session
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY);
    if (wasDismissed) return;

    async function checkPending() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.rpc("get_pending_reviews");
      if (data && (data as PendingReview[]).length > 0) {
        setPendingReviews(data as PendingReview[]);
        setDismissed(false);
      }
    }

    checkPending();
  }, [supabase]);

  if (dismissed || pendingReviews.length === 0) return null;

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, "1");
  }

  const firstPending = pendingReviews[0];

  return (
    <div className="mx-auto mb-4 max-w-4xl px-4">
      <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
        <svg
          className="h-5 w-5 flex-shrink-0 text-warning"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-main">
            {t("pendingRating.ridesToRate", { count: String(pendingReviews.length) })}
          </p>
        </div>
        <Link
          href={`/rides/${firstPending.ride_id}?justCompleted=true`}
          className="flex-shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
        >
          {t("pendingRating.rateNow")}
        </Link>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 rounded-lg p-1 text-text-secondary transition-colors hover:bg-primary/5 hover:text-text-main"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
