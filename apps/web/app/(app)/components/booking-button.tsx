"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { BOOKING_STATUS, type BookingStatus } from "@festapp/shared";

interface BookingButtonProps {
  rideId: string;
  bookingMode: "instant" | "request";
  seatsAvailable: number;
  driverId: string;
  currentUserId: string | null;
  existingBooking: { status: BookingStatus; seats_booked: number } | null;
}

export function BookingButton({
  rideId,
  bookingMode,
  seatsAvailable,
  driverId,
  currentUserId,
  existingBooking,
}: BookingButtonProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [seats, setSeats] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const seatWord = (count: number) =>
    count === 1 ? t("rideDetail.seatSingular") : t("rideDetail.seatPlural");

  // Driver can't book their own ride
  if (!currentUserId || currentUserId === driverId) {
    return null;
  }

  // Already booked - show status badge
  if (existingBooking) {
    if (existingBooking.status === BOOKING_STATUS.pending) {
      return (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-warning/10 px-6 py-3">
          <span className="text-sm font-semibold text-warning">
            {t("bookingButton.requestPending")}
          </span>
        </div>
      );
    }
    if (existingBooking.status === BOOKING_STATUS.confirmed) {
      return (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-success/10 px-6 py-3">
          <span className="text-sm font-semibold text-success">
            {t("bookingButton.booked", {
              seats: existingBooking.seats_booked,
              seatWord: seatWord(existingBooking.seats_booked),
            })}
          </span>
        </div>
      );
    }
  }

  // No seats available
  if (seatsAvailable === 0) {
    return (
      <button
        disabled
        className="mt-4 w-full rounded-xl bg-gray-200 px-6 py-3 text-base font-semibold text-gray-500"
      >
        {t("bookingButton.fullyBooked")}
      </button>
    );
  }

  async function handleBook() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const rpcName =
        bookingMode === "instant" ? "book_ride_instant" : "request_ride_booking";
      const { error } = await supabase.rpc(rpcName, {
        p_ride_id: rideId,
        p_passenger_id: currentUserId!,
        p_seats: seats,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("not enough seats")) {
          toast.error(t("bookingButton.notEnoughSeats"));
        } else if (msg.includes("already booked") || msg.includes("already requested")) {
          toast.error(t("bookingButton.alreadyBooked"));
        } else if (msg.includes("driver cannot book") || msg.includes("own ride")) {
          toast.error(t("bookingButton.cantBookOwn"));
        } else {
          toast.error(t("bookingButton.bookingFailed"));
        }
        return;
      }

      toast.success(
        bookingMode === "instant" ? t("bookingButton.seatBooked") : t("bookingButton.requestSent")
      );
      router.refresh();
    } catch {
      toast.error(t("bookingButton.bookingFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  const isInstant = bookingMode === "instant";

  return (
    <div className="mt-4 flex items-center gap-3">
      {/* Seat selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="seat-count" className="text-sm text-text-secondary">
          {t("bookingButton.seats")}:
        </label>
        <input
          id="seat-count"
          type="number"
          min={1}
          max={seatsAvailable}
          value={seats}
          onChange={(e) => {
            const v = Math.max(1, Math.min(seatsAvailable, Number(e.target.value) || 1));
            setSeats(v);
          }}
          className="w-16 rounded-lg border border-border-pastel bg-surface px-2 py-1.5 text-center text-sm text-text-main focus:border-primary focus:outline-none"
        />
      </div>

      {/* Action button */}
      <button
        onClick={handleBook}
        disabled={isLoading}
        className={`flex-1 rounded-xl px-6 py-3 text-base font-semibold transition-colors disabled:opacity-50 ${
          isInstant
            ? "bg-primary text-surface hover:bg-primary/90"
            : "border border-primary bg-surface text-primary hover:bg-primary/5"
        }`}
      >
        {isLoading
          ? t("bookingButton.processing")
          : isInstant
            ? t("bookingButton.bookSeats", { count: seats, seatWord: seatWord(seats) })
            : t("bookingButton.requestSeats", { count: seats, seatWord: seatWord(seats) })}
      </button>
    </div>
  );
}
