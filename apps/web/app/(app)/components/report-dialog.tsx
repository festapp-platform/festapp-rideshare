"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ReportUserSchema } from "@festapp/shared";

interface ReportDialogProps {
  reportedUserId: string;
  reportedUserName: string;
  isOpen: boolean;
  onClose: () => void;
  rideId?: string | null;
  bookingId?: string | null;
  reviewId?: string | null;
}

/**
 * Modal dialog for reporting another user with a free text description.
 * Calls report_user RPC on submit. Validates 10-2000 char description.
 */
export function ReportDialog({
  reportedUserId,
  reportedUserName,
  isOpen,
  onClose,
  rideId,
  bookingId,
  reviewId,
}: ReportDialogProps) {
  const supabase = createClient();
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const charCount = description.length;
  const isValid = charCount >= 10 && charCount <= 2000;

  async function handleSubmit() {
    const parsed = ReportUserSchema.safeParse({
      reported_user_id: reportedUserId,
      description: description.trim(),
      ride_id: rideId || null,
      booking_id: bookingId || null,
      review_id: reviewId || null,
    });

    if (!parsed.success) {
      toast.error("Please provide a description between 10 and 2000 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc("report_user", {
        p_reported_user_id: parsed.data.reported_user_id,
        p_description: parsed.data.description,
        p_ride_id: parsed.data.ride_id ?? null,
        p_booking_id: parsed.data.booking_id ?? null,
        p_review_id: parsed.data.review_id ?? null,
      });

      if (error) throw error;

      toast.success("Report submitted. Our team will review it.");
      setDescription("");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit report";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-text-main">
          Report {reportedUserName}
        </h2>

        <p className="mb-3 text-sm text-text-secondary">
          Please describe the issue in your own words. Our team will review your report.
        </p>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
          maxLength={2000}
          rows={5}
          placeholder="Describe what happened (minimum 10 characters)..."
          className="mb-1 w-full resize-none rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p
          className={`mb-6 text-right text-xs ${
            charCount < 10 ? "text-text-secondary" : "text-text-secondary"
          }`}
        >
          {charCount}/2000{charCount > 0 && charCount < 10 && " (minimum 10)"}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-border-pastel px-4 py-2.5 text-sm font-semibold text-text-main transition-colors hover:bg-background disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !isValid}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
