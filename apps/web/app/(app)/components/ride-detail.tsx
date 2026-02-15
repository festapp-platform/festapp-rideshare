"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { RIDE_STATUS, type BookingStatus } from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import { RouteMap } from "./route-map";
import { RideStatusBadge } from "./ride-status-badge";
import { BookingButton } from "./booking-button";
import { PassengerList } from "./passenger-list";
import { CancellationDialog } from "./cancellation-dialog";
import { ReliabilityBadge, type DriverReliability } from "./reliability-badge";

interface RideProfile {
  display_name: string;
  avatar_url: string | null;
  rating_avg: number;
  rating_count: number;
}

interface RideVehicle {
  make: string;
  model: string;
  color: string | null;
  license_plate: string | null;
  photo_url: string | null;
}

interface WaypointData {
  id: string;
  address: string;
  location: unknown;
  order_index: number;
}

interface RideData {
  id: string;
  driver_id: string;
  origin_address: string;
  destination_address: string;
  origin_location: unknown;
  destination_location: unknown;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  price_czk: number | null;
  suggested_price_czk: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  route_encoded_polyline: string | null;
  booking_mode: string;
  preferences: Record<string, unknown>;
  notes: string | null;
  status: string;
  profiles: RideProfile | null;
  vehicles: RideVehicle | null;
}

interface BookingData {
  id: string;
  passenger_id: string;
  seats_booked: number;
  status: BookingStatus;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    rating_avg: number;
  } | null;
}

interface RideDetailProps {
  ride: RideData;
  isOwner: boolean;
  waypoints: WaypointData[];
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  bookings: BookingData[];
  currentUserBooking: { id: string; status: BookingStatus; seats_booked: number } | null;
  currentUserId: string | null;
  driverReliability: DriverReliability | null;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

const preferenceIcons: { key: string; label: string; icon: string }[] = [
  { key: "smoking", label: "Smoking allowed", icon: "🚬" },
  { key: "pets", label: "Pets welcome", icon: "🐾" },
  { key: "music", label: "Music on", icon: "🎵" },
  { key: "chat", label: "Chatty", icon: "💬" },
];

/** Button that creates/opens a conversation from a ride detail page (CHAT-04). */
function MessageRideButton({
  bookingId,
  otherPartyName,
}: {
  bookingId: string;
  otherPartyName: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: conversationId, error } = await supabase.rpc(
        "get_or_create_conversation",
        { p_booking_id: bookingId },
      );
      if (error) {
        toast.error("Could not open conversation");
        return;
      }
      router.push(`/messages/${conversationId}`);
    } catch {
      toast.error("Could not open conversation");
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, router, supabase]);

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary bg-surface px-5 py-3 font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
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
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      {isLoading ? "Opening..." : `Message ${otherPartyName}`}
    </button>
  );
}

export function RideDetail({
  ride,
  isOwner,
  waypoints,
  originLat,
  originLng,
  destLat,
  destLng,
  bookings,
  currentUserBooking,
  currentUserId,
  driverReliability,
}: RideDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [cancelDialogType, setCancelDialogType] = useState<"booking" | "ride" | null>(null);
  const [cancelDialogId, setCancelDialogId] = useState<string>("");
  const [completeConfirm, setCompleteConfirm] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const departureDate = parseISO(ride.departure_time);
  const formattedDate = format(departureDate, "EEE, MMM d, yyyy");
  const formattedTime = format(departureDate, "h:mm a");
  const profile = ride.profiles;
  const vehicle = ride.vehicles;
  const isPastDeparture = new Date() > departureDate;
  const isCompletable =
    isOwner &&
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
      const { error } = await supabase.rpc("complete_ride", {
        p_ride_id: ride.id,
        p_driver_id: ride.driver_id,
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
      router.refresh();
    } catch {
      toast.error("Failed to complete ride");
      setCompleteConfirm(false);
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Route header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-lg font-bold text-text-main sm:text-xl">
            <span className="truncate">{ride.origin_address}</span>
            <svg
              className="h-5 w-5 flex-shrink-0 text-text-secondary"
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
        </div>
        <RideStatusBadge status={ride.status} />
      </div>

      {/* Completed banner */}
      {isCompleted && (
        <div className="rounded-xl bg-success/10 p-4 text-sm font-medium text-success">
          This ride has been completed.
        </div>
      )}

      {/* Map */}
      {ride.route_encoded_polyline && (
        <RouteMap
          encodedPolyline={ride.route_encoded_polyline}
          originLat={originLat}
          originLng={originLng}
          destLat={destLat}
          destLng={destLng}
        />
      )}

      {/* Trip info */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-5">
        <h2 className="mb-3 text-base font-semibold text-text-main">
          Trip Details
        </h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {ride.distance_meters && (
            <div className="rounded-lg bg-primary/5 px-3 py-1.5">
              <span className="text-text-secondary">Distance: </span>
              <span className="font-medium text-text-main">
                {formatDistance(ride.distance_meters)}
              </span>
            </div>
          )}
          {ride.duration_seconds && (
            <div className="rounded-lg bg-primary/5 px-3 py-1.5">
              <span className="text-text-secondary">Duration: </span>
              <span className="font-medium text-text-main">
                {formatDuration(ride.duration_seconds)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Price */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-main">Price</h2>
          <span className="text-2xl font-bold text-primary">
            {ride.price_czk != null ? `${ride.price_czk} CZK` : "Free"}
          </span>
        </div>
      </section>

      {/* Driver section */}
      {profile && (
        <section className="rounded-2xl border border-border-pastel bg-surface p-5">
          <h2 className="mb-3 text-base font-semibold text-text-main">
            Driver
          </h2>
          <Link
            href={`/profile/${ride.driver_id}`}
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                profile.display_name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="font-semibold text-text-main">
                {profile.display_name}
              </p>
              <div className="flex items-center gap-1 text-sm text-text-secondary">
                <svg
                  className="h-4 w-4 text-warning"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>
                  {profile.rating_avg.toFixed(1)}
                  {profile.rating_count > 0 && (
                    <span className="ml-0.5">({profile.rating_count})</span>
                  )}
                </span>
              </div>
            </div>
          </Link>
          {driverReliability && (
            <div className="mt-3">
              <ReliabilityBadge reliability={driverReliability} />
            </div>
          )}
        </section>
      )}

      {/* Vehicle section */}
      {vehicle && (
        <section className="rounded-2xl border border-border-pastel bg-surface p-5">
          <h2 className="mb-3 text-base font-semibold text-text-main">
            Vehicle
          </h2>
          <div className="flex items-center gap-4">
            {vehicle.photo_url ? (
              <img
                src={vehicle.photo_url}
                alt={`${vehicle.make} ${vehicle.model}`}
                className="h-16 w-24 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-primary/5 text-2xl">
                🚗
              </div>
            )}
            <div>
              <p className="font-semibold text-text-main">
                {vehicle.make} {vehicle.model}
              </p>
              {vehicle.color && (
                <p className="text-sm text-text-secondary">{vehicle.color}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Preferences */}
      {ride.preferences &&
        Object.keys(ride.preferences).length > 0 && (
          <section className="rounded-2xl border border-border-pastel bg-surface p-5">
            <h2 className="mb-3 text-base font-semibold text-text-main">
              Preferences
            </h2>
            <div className="flex flex-wrap gap-3">
              {preferenceIcons.map(({ key, label, icon }) => {
                const val = ride.preferences[key];
                if (val === undefined) return null;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                      val
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500 line-through"
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      {/* Notes */}
      {ride.notes && (
        <section className="rounded-2xl border border-border-pastel bg-surface p-5">
          <h2 className="mb-2 text-base font-semibold text-text-main">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-text-secondary">
            {ride.notes}
          </p>
        </section>
      )}

      {/* Booking section */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-main">
              Booking
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {ride.seats_available} of {ride.seats_total}{" "}
              {ride.seats_available === 1 ? "seat" : "seats"} available
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              ride.booking_mode === "instant"
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning"
            }`}
          >
            {ride.booking_mode === "instant" ? "Instant" : "Request"}
          </span>
        </div>
        {!isOwner && ride.status === RIDE_STATUS.upcoming && (
          <BookingButton
            rideId={ride.id}
            bookingMode={ride.booking_mode as "instant" | "request"}
            seatsAvailable={ride.seats_available}
            driverId={ride.driver_id}
            currentUserId={currentUserId}
            existingBooking={currentUserBooking}
          />
        )}
        {/* Passenger booking cancellation */}
        {!isOwner &&
          currentUserBooking &&
          (currentUserBooking.status === "pending" ||
            currentUserBooking.status === "confirmed") && (
            <button
              onClick={() => {
                setCancelDialogType("booking");
                setCancelDialogId(currentUserBooking.id);
              }}
              className="mt-3 w-full rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Cancel Booking
            </button>
          )}
      </section>

      {/* Message button for confirmed bookings (CHAT-04) */}
      {!isOwner &&
        currentUserBooking?.status === "confirmed" &&
        currentUserId && (
          <MessageRideButton
            bookingId={currentUserBooking.id}
            otherPartyName={profile?.display_name ?? "driver"}
          />
        )}
      {isOwner &&
        bookings.some((b) => b.status === "confirmed") &&
        currentUserId && (
          <div className="space-y-2">
            {bookings
              .filter((b) => b.status === "confirmed")
              .map((booking) => (
                <MessageRideButton
                  key={booking.id}
                  bookingId={booking.id}
                  otherPartyName={
                    booking.profiles?.display_name ?? "passenger"
                  }
                />
              ))}
          </div>
        )}

      {/* Passengers */}
      <PassengerList
        bookings={
          isOwner
            ? bookings.filter(
                (b) => b.status === "confirmed" || b.status === "pending",
              )
            : bookings.filter((b) => b.status === "confirmed")
        }
        seatsTotal={ride.seats_total}
      />

      {/* Manage Bookings link for driver */}
      {isOwner &&
        ride.status === RIDE_STATUS.upcoming &&
        (ride.booking_mode === "request" ||
          bookings.some((b) => b.status === "pending")) && (
          <Link
            href={`/rides/${ride.id}/manage`}
            className="flex items-center justify-between rounded-2xl border border-border-pastel bg-surface p-5 transition-colors hover:bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">
                Manage Bookings
              </span>
              {bookings.filter((b) => b.status === "pending").length > 0 && (
                <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                  {bookings.filter((b) => b.status === "pending").length}{" "}
                  pending{" "}
                  {bookings.filter((b) => b.status === "pending").length === 1
                    ? "request"
                    : "requests"}
                </span>
              )}
            </div>
            <svg
              className="h-5 w-5 text-text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        )}

      {/* Owner actions */}
      {isOwner &&
        (ride.status === RIDE_STATUS.upcoming ||
          ride.status === "in_progress") && (
        <div className="space-y-3">
          {/* Complete ride button */}
          {isCompletable ? (
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
          ) : (
            isOwner &&
            !isPastDeparture && (
              <div
                className="w-full rounded-xl border border-gray-300 px-6 py-3 text-center font-semibold text-gray-400 cursor-not-allowed"
                title="Available after departure time"
              >
                Complete Ride
                <span className="block text-xs font-normal mt-0.5">
                  Cannot complete before departure ({formattedDate} at {formattedTime})
                </span>
              </div>
            )
          )}

          <div className="flex gap-3">
            <Link
              href={`/rides/${ride.id}/edit`}
              className="flex-1 rounded-xl border border-primary bg-surface px-6 py-3 text-center font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              Edit Ride
            </Link>
            <button
              onClick={() => {
                setCancelDialogType("ride");
                setCancelDialogId(ride.id);
              }}
              className="flex-1 rounded-xl border border-red-300 px-6 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Cancel Ride
            </button>
          </div>
        </div>
      )}

      {/* Cancellation dialog */}
      {cancelDialogType && (
        <CancellationDialog
          type={cancelDialogType}
          id={cancelDialogId}
          isOpen={true}
          onClose={() => setCancelDialogType(null)}
          onCancelled={() => router.refresh()}
        />
      )}
    </div>
  );
}
