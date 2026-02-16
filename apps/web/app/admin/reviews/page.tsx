"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getReviewsForAdmin } from "@festapp/shared";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/app/(app)/components/confirm-dialog";

type AdminReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  revealed_at: string | null;
  reviewer: { id: string; display_name: string; avatar_url: string | null } | null;
  reviewee: { id: string; display_name: string; avatar_url: string | null } | null;
};

const FILTER_OPTIONS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Revealed", value: "revealed" },
  { label: "Hidden", value: "hidden" },
];

/**
 * Admin reviews management page (ADMN-04).
 * View, hide, or delete reviews for content moderation.
 */
export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await getReviewsForAdmin(supabase);
    const normalized = (data ?? []).map((r: any) => ({
      ...r,
      reviewer: Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer,
      reviewee: Array.isArray(r.reviewee) ? r.reviewee[0] : r.reviewee,
    }));

    // Apply client-side filter
    let filtered = normalized;
    if (filter === "revealed") {
      filtered = normalized.filter((r: AdminReview) => r.revealed_at !== null);
    } else if (filter === "hidden") {
      filtered = normalized.filter((r: AdminReview) => r.revealed_at === null);
    }

    setReviews(filtered);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  async function handleHide(reviewId: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_hide_review", {
      p_review_id: reviewId,
    });
    if (error) {
      toast.error(error.message || "Failed to hide review");
      return;
    }
    toast.success("Review hidden");
    fetchReviews();
  }

  async function performDelete(reviewId: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_delete_review", {
      p_review_id: reviewId,
    });
    if (error) {
      toast.error(error.message || "Failed to delete review");
      return;
    }
    toast.success("Review deleted");
    fetchReviews();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and moderate user reviews
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setFilter(opt.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === opt.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-16">
          <Star className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No reviews found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Reviewer
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 sm:table-cell">
                  Reviewee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Rating
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 md:table-cell">
                  Comment
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 sm:table-cell">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${review.reviewer?.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {review.reviewer?.display_name || "Unknown"}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Link
                      href={`/admin/users/${review.reviewee?.id}`}
                      className="text-sm text-gray-600 hover:text-indigo-600"
                    >
                      {review.reviewee?.display_name || "Unknown"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-yellow-500">
                      {"*".repeat(review.rating)}
                      {"*".repeat(5 - review.rating).replace(/\*/g, "")}
                    </span>
                    <span className="ml-1 text-xs text-gray-400">
                      {review.rating}/5
                    </span>
                  </td>
                  <td className="hidden max-w-xs px-4 py-3 md:table-cell">
                    <p className="truncate text-sm text-gray-500">
                      {review.comment || "-"}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        review.revealed_at
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {review.revealed_at ? "Revealed" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {review.revealed_at && (
                        <button
                          onClick={() => handleHide(review.id)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                        >
                          Hide
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(review.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            performDelete(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        title="Delete Review"
        message="Permanently delete this review? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
