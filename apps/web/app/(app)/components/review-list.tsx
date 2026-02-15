"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getReviewsForUser } from "@festapp/shared";
import { ReviewCard } from "./review-card";

/**
 * Review list component for the profile page.
 *
 * Fetches revealed reviews for a user and displays them newest first.
 * Shows loading skeleton while fetching and empty state when no reviews.
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

interface ReviewListProps {
  userId: string;
}

export function ReviewList({ userId }: ReviewListProps) {
  const supabase = createClient();
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    const { data, error } = await getReviewsForUser(supabase, userId);
    if (!error && data) {
      // Map the query result to our ReviewData shape
      setReviews(
        (data as unknown as ReviewData[]).map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          reviewer: r.reviewer,
        })),
      );
    }
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border-pastel bg-surface p-4"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-border-pastel" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-border-pastel" />
                <div className="h-3 w-20 rounded bg-border-pastel" />
                <div className="h-3 w-full rounded bg-border-pastel" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-border-pastel bg-surface p-6 text-center">
        <p className="text-sm text-text-secondary">No reviews yet</p>
        <p className="mt-1 text-xs text-text-secondary/70">
          Reviews will appear here after completed rides
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}
