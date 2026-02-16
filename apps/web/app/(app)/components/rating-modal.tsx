"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { REVIEW_MAX_COMMENT_LENGTH } from "@festapp/shared";
import { DialogOverlay } from "@/components/dialog-overlay";

/**
 * Post-ride rating modal with 1-5 star picker and optional comment textarea.
 *
 * Calls submit_review RPC on form submit.
 * Handles "already reviewed", "window has expired", and generic errors.
 * On success, shows appropriate toasts based on dual-reveal status.
 */

interface RatingModalProps {
  bookingId: string;
  otherUserName: string;
  otherUserAvatar?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const starPath =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

export function RatingModal({
  bookingId,
  otherUserName,
  otherUserAvatar,
  isOpen,
  onClose,
  onSubmitted,
}: RatingModalProps) {
  const supabase = createClient();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_review", {
        p_booking_id: bookingId,
        p_rating: rating,
        p_comment: comment.trim() || null,
      });

      if (error) {
        if (error.message.includes("already reviewed") || error.message.includes("already submitted")) {
          toast.error("You have already reviewed this ride");
        } else if (error.message.includes("expired") || error.message.includes("deadline")) {
          toast.error("The review window has expired");
        } else {
          toast.error("Failed to submit rating");
        }
        return;
      }

      toast.success("Rating submitted!");
      onSubmitted();
    } catch {
      toast.error("Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogOverlay open={isOpen} onClose={onClose}>
      <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary/5 hover:text-text-main"
        >
          <svg
            className="h-5 w-5"
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

        {/* Header */}
        <div className="mb-6 flex flex-col items-center">
          {otherUserAvatar ? (
            <img
              src={otherUserAvatar}
              alt={otherUserName}
              className="mb-3 h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {otherUserName.charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="text-lg font-bold text-text-main">
            Rate your ride with {otherUserName}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            How was your experience?
          </p>
        </div>

        {/* Star picker */}
        <div className="mb-6 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <svg
                className={`h-10 w-10 transition-colors ${
                  star <= (hoveredStar || rating)
                    ? "text-yellow-400"
                    : "text-border-pastel"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d={starPath} />
              </svg>
            </button>
          ))}
        </div>

        {/* Comment textarea */}
        <div className="mb-6">
          <label
            htmlFor="review-comment"
            className="mb-1.5 block text-sm font-medium text-text-main"
          >
            Comment (optional)
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={REVIEW_MAX_COMMENT_LENGTH}
            rows={3}
            placeholder="Share your experience..."
            className="w-full resize-none rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-right text-xs text-text-secondary">
            {comment.length}/{REVIEW_MAX_COMMENT_LENGTH}
          </p>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          className="w-full rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit Rating"}
        </button>
      </div>
    </DialogOverlay>
  );
}
