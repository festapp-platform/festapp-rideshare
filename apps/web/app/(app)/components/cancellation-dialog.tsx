"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { DialogOverlay } from "@/components/dialog-overlay";
import { useI18n } from "@/lib/i18n/provider";

interface CancellationDialogProps {
  type: "booking" | "ride";
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

/**
 * Modal dialog for cancelling a booking or ride with an optional reason.
 * Calls the appropriate Supabase RPC (cancel_booking or cancel_ride).
 */
export function CancellationDialog({
  type,
  id,
  isOpen,
  onClose,
  onCancelled,
}: CancellationDialogProps) {
  const supabase = createClient();
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const title = type === "booking" ? t("cancellation.cancelBooking") : t("cancellation.cancelRide");

  async function handleConfirm() {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const trimmedReason = reason.trim() || undefined;

      if (type === "booking") {
        const { error } = await supabase.rpc("cancel_booking", {
          p_booking_id: id,
          p_user_id: user.id,
          p_reason: trimmedReason,
        });
        if (error) throw error;
        toast.success(t("cancellation.bookingCancelled"));
      } else {
        const { error } = await supabase.rpc("cancel_ride", {
          p_ride_id: id,
          p_driver_id: user.id,
          p_reason: trimmedReason,
        });
        if (error) throw error;
        toast.success(t("cancellation.rideCancelled"));
      }

      onCancelled();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("cancellation.failed");
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DialogOverlay open={isOpen} onClose={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-text-main">{title}</h2>

        {type === "ride" && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {t("cancellation.rideWarning")}
          </div>
        )}

        <label className="mb-1 block text-sm font-medium text-text-secondary">
          {t("cancellation.reasonOptional")}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          maxLength={500}
          rows={3}
          placeholder={t("cancellation.reasonPlaceholder")}
          className="mb-1 w-full resize-none rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="mb-6 text-right text-xs text-text-secondary">
          {reason.length}/500
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-border-pastel px-4 py-2.5 text-sm font-semibold text-text-main transition-colors hover:bg-background disabled:opacity-50"
          >
            {t("cancellation.keep")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? t("cancellation.cancelling") : t("cancellation.confirm")}
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
}
