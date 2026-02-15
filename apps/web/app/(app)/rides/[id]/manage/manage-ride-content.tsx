"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { BOOKING_STATUS, RIDE_STATUS } from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import { BookingRequestCard } from "../../../components/booking-request-card";

interface RideSummary {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  status: string;
}

interface PassengerProfile {
  display_name: string;
  avatar_url: string | null;
  rating_avg: number;
}

interface Booking {
  id: string;
  ride_id: string;
  passenger_id: string;
  seats_booked: number;
  status: string;
  created_at: string;
  profiles: PassengerProfile | null;
}

interface ManageRideContentProps {
  ride: RideSummary;
  bookings: Booking[];
}

export function ManageRideContent({ ride, bookings }: ManageRideContentProps) {
  const router = useRouter();
  const supabase = createClient();

  const pendingBookings = bookings.filter(
    (b) => b.status === BOOKING_STATUS.pending,
  );
  const confirmedBookings = bookings.filter(
    (b) => b.status === BOOKING_STATUS.confirmed,
  );

  const confirmedSeats = confirmedBookings.reduce(
    (sum, b) => sum + b.seats_booked,
    0,
  );

  const [completeConfirm, setCompleteConfirm] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const departureDate = parseISO(ride.departure_time);
  const formattedDate = format(departureDate, "EEE, MMM d, yyyy");
  const formattedTime = format(departureDate, "h:mm a");
  const isPastDeparture = new Date() > departureDate;
  const isCompletable =
    (ride.status === RIDE_STATUS.upcoming || ride.status === "in_progress") &&
    isPastDeparture;
  const isCompleted = ride.status === RIDE_STATUS.completed;

  async function handleComplete() {
    if (!completeConfirm) {
      setCompleteConfirm(true);
      return;
    }

    setIsCompleting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc("complete_ride", {
        p_ride_id: ride.id,
        p_driver_id: user.id,
      });
      if (error) {
        if (error.message.includes("Only the driver")) {
          toast.error("Only the ride driver can complete this ride");
        } else if (error.message.includes("cannot be completed")) {
          toast.error("This ride cannot be completed from its current status");
        } else {
          toast.error("Failed to complete ride");
        }
        setCompleteConfirm(false);
        return;
      }
      toast.success("Ride completed!");
      router.push(`/rides/${ride.id}?justCompleted=true`);
    } catch {
      toast.error("Failed to complete ride");
      setCompleteConfirm(false);
    } finally {
      setIsCompleting(false);
    }
  }

  // Realtime subscription for booking changes
  useEffect(() => {
    const channel = supabase
      .channel(`ride-bookings-${ride.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `ride_id=eq.${ride.id}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ride.id, router, supabase]);

  function handleRespond() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header with back link */}
      <div className="flex items-center gap-3">
        <Link
          href={`/rides/${ride.id}`}
          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary/5 hover:text-text-main"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-text-main">Manage Bookings</h1>
      </div>

      {/* Ride summary */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-5">
        <div className="mb-2 flex items-center gap-2 text-base font-semibold text-text-main">
          <span className="truncate">{ride.origin_address}</span>
          <svg
            className="h-4 w-4 flex-shrink-0 text-text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
          <span className="truncate">{ride.destination_address}</span>
        </div>
        <p className="text-sm text-text-secondary">
          {formattedDate} at {formattedTime}
        </p>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
            {confirmedSeats} / {ride.seats_total} seats confirmed
          </span>
          <span className="text-text-secondary">
            {ride.seats_available} available
          </span>
        </div>
      </section>

      {/* Completed banner */}
      {isCompleted && (
        <div className="rounded-xl bg-success/10 p-4 text-sm font-medium text-success">
          This ride has been completed. All bookings have been finalized.
        </div>
      )}

      {/* Complete ride button */}
      {!isCompleted && isCompletable && (
        <button
          onClick={handleComplete}
          disabled={isCompleting}
          className={`w-full rounded-xl px-6 py-3 font-semibold transition-colors ${
            completeConfirm
              ? "bg-green-600 text-white hover:bg-green-700"
              : "border border-green-500 text-green-600 hover:bg-green-50"
          } disabled:opacity-50`}
        >
          {isCompleting
            ? "Completing..."
            : completeConfirm
              ? "Confirm Complete?"
              : "Complete Ride"}
        </button>
      )}
      {!isCompleted && !isPastDeparture && (
        <div
          className="w-full rounded-xl border border-gray-300 px-6 py-3 text-center font-semibold text-gray-400 cursor-not-allowed"
          title="Available after departure time"
        >
          Complete Ride
          <span className="block text-xs font-normal mt-0.5">
            Cannot complete before departure ({formattedDate} at {formattedTime})
          </span>
        </div>
      )}

      {/* Pending requests */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-text-main">
          Pending Requests
          {pendingBookings.length > 0 && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
              {pendingBookings.length}
            </span>
          )}
        </h2>
        {pendingBookings.length === 0 ? (
          <div className="rounded-2xl border border-border-pastel bg-surface p-6 text-center">
            <p className="text-sm text-text-secondary">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingBookings.map((booking) => (
              <BookingRequestCard
                key={booking.id}
                booking={booking}
                onRespond={handleRespond}
              />
            ))}
          </div>
        )}
      </section>

      {/* Confirmed passengers */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-text-main">
          Confirmed Passengers ({confirmedSeats})
        </h2>
        {confirmedBookings.length === 0 ? (
          <div className="rounded-2xl border border-border-pastel bg-surface p-6 text-center">
            <p className="text-sm text-text-secondary">
              No confirmed passengers yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {confirmedBookings.map((booking) => {
              const profile = booking.profiles;
              const initials = profile
                ? profile.display_name.charAt(0).toUpperCase()
                : "?";

              return (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 rounded-xl border border-border-pastel bg-surface p-4"
                >
                  <Link
                    href={`/profile/${booking.passenger_id}`}
                    className="flex-shrink-0"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.display_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${booking.passenger_id}`}
                      className="font-semibold text-text-main hover:underline"
                    >
                      {profile?.display_name ?? "Unknown"}
                    </Link>
                    <p className="text-sm text-text-secondary">
                      {booking.seats_booked}{" "}
                      {booking.seats_booked === 1 ? "seat" : "seats"}
                    </p>
                  </div>
                  <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                    Confirmed
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
