"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { RIDE_STATUS, type BookingStatus, formatPrice } from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { useLiveLocation } from "@/app/(app)/hooks/use-live-location";
import { RouteMap } from "./route-map";
import { LiveLocationMap } from "./live-location-map";
import { RideStatusBadge } from "./ride-status-badge";
import { BookingButton } from "./booking-button";
import { PassengerList } from "./passenger-list";
import { CancellationDialog } from "./cancellation-dialog";
import { ReliabilityBadge, type DriverReliability } from "./reliability-badge";
import { RatingModal } from "./rating-modal";
import { Cigarette, PawPrint, Music, MessageCircle, Car as CarIcon } from "lucide-react";

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
  showRatingModal?: boolean;
  ratingBookingId?: string | null;
  ratingOtherUserName?: string | null;
  ratingOtherUserAvatar?: string | null;
  hasExistingReview?: boolean;
  rideStatus?: string;
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
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: conversationId, error } = await supabase.rpc(
        "get_or_create_conversation",
        { p_booking_id: bookingId },
      );
      if (error) {
        toast.error(t("rideDetail.couldNotOpenConversation"));
        return;
      }
      router.push(`/messages/${conversationId}`);
    } catch {
      toast.error(t("rideDetail.couldNotOpenConversation"));
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, router, supabase, t]);

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
      {isLoading ? t("rideDetail.opening") : t("rideDetail.message", { name: otherPartyName })}
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
  showRatingModal: initialShowRatingModal = false,
  ratingBookingId = null,
  ratingOtherUserName = null,
  ratingOtherUserAvatar = null,
  hasExistingReview = false,
  rideStatus,
}: RideDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useI18n();
  const [cancelDialogType, setCancelDialogType] = useState<"booking" | "ride" | null>(null);
  const [cancelDialogId, setCancelDialogId] = useState<string>("");
  const [completeConfirm, setCompleteConfirm] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showRating, setShowRating] = useState(initialShowRatingModal);
  const [hasReviewed, setHasReviewed] = useState(hasExistingReview);
  const [liveLocationEnabled, setLiveLocationEnabled] = useState(false);
  const [isStartingRide, setIsStartingRide] = useState(false);
  const [localRideStatus, setLocalRideStatus] = useState(ride.status);

  const departureDate = parseISO(ride.departure_time);
  const formattedDate = format(departureDate, "EEE, MMM d, yyyy");
  const formattedTime = format(departureDate, "h:mm a");
  const profile = ride.profiles;
  const vehicle = ride.vehicles;
  const isPastDeparture = new Date() > departureDate;

  const seatWord = (count: number) =>
    count === 1 ? t("rideDetail.seatSingular") : t("rideDetail.seatPlural");

  // Preference icons with translated labels
  const preferenceIcons: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: "smoking", label: t("rideDetail.prefSmoking"), icon: <Cigarette className="h-4 w-4" /> },
    { key: "pets", label: t("rideDetail.prefPets"), icon: <PawPrint className="h-4 w-4" /> },
    { key: "music", label: t("rideDetail.prefMusic"), icon: <Music className="h-4 w-4" /> },
    { key: "chat", label: t("rideDetail.prefChat"), icon: <MessageCircle className="h-4 w-4" /> },
  ];

  // Passenger auto-enables live location when ride is in_progress and they have a confirmed booking
  const passengerAutoEnabled =
    !isOwner &&
    localRideStatus === "in_progress" &&
    currentUserBooking?.status === "confirmed";

  const { driverPosition, isSharing, error: locationError, stopSharing } =
    useLiveLocation({
      rideId: ride.id,
      isDriver: isOwner,
      enabled: liveLocationEnabled || passengerAutoEnabled,
      pickupLocation: { lat: originLat, lng: originLng },
    });

  // Show LiveLocationMap when driver is sharing or passenger has active tracking
  const showLiveMap =
    (isOwner && isSharing) ||
    (!isOwner && passengerAutoEnabled && driverPosition !== null);

  // Show share location button for driver
  const canShareLocation =
    isOwner &&
    (localRideStatus === RIDE_STATUS.upcoming || localRideStatus === "in_progress") &&
    isPastDeparture;

  const isCompletable =
    isOwner &&
    (localRideStatus === RIDE_STATUS.upcoming || localRideStatus === "in_progress") &&
    isPastDeparture;
  const isCompleted = localRideStatus === RIDE_STATUS.completed;

  // Show location errors as toast
  useEffect(() => {
    if (locationError) {
      toast.error(locationError);
    }
  }, [locationError]);

  // Auto-stop location sharing when ride is completed or cancelled (including from other tabs/devices)
  useEffect(() => {
    const channel = supabase
      .channel(`ride-status-${ride.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter: `id=eq.${ride.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status: string }).status;
          if (newStatus === "completed" || newStatus === "cancelled") {
            stopSharing();
            setLocalRideStatus(newStatus);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ride.id, supabase, stopSharing]);

  async function handleShareLocation() {
    if (localRideStatus === "in_progress") {
      // Already in progress, just enable tracking
      setLiveLocationEnabled(true);
      return;
    }

    setIsStartingRide(true);
    try {
      const { error } = await supabase.rpc("start_ride", {
        p_ride_id: ride.id,
        p_driver_id: currentUserId!,
      });
      if (error) {
        toast.error(t("rideDetail.failedToStartRide"));
        return;
      }
      setLocalRideStatus("in_progress");
      setLiveLocationEnabled(true);
      toast.success(t("rideDetail.locationSharingStarted"));
    } catch {
      toast.error(t("rideDetail.failedToStartRide"));
    } finally {
      setIsStartingRide(false);
    }
  }

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
          toast.error(t("rideDetail.onlyDriverCanComplete"));
        } else if (error.message.includes("cannot be completed")) {
          toast.error(t("rideDetail.cannotCompleteStatus"));
        } else {
          toast.error(t("rideDetail.failedToCompleteRide"));
        }
        setCompleteConfirm(false);
        return;
      }
      stopSharing();
      toast.success(t("rideDetail.rideCompletedToast"));
      router.push(`/rides/${ride.id}?justCompleted=true`);
    } catch {
      toast.error(t("rideDetail.failedToCompleteRide"));
      setCompleteConfirm(false);
    } finally {
      setIsCompleting(false);
    }
  }

  const pendingCount = bookings.filter((b) => b.status === "pending").length;

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
          {t("rideDetail.rideCompleted")}
        </div>
      )}

      {/* Map -- live location map replaces route map during active sharing */}
      {showLiveMap ? (
        <LiveLocationMap
          pickupLat={originLat}
          pickupLng={originLng}
          driverPosition={driverPosition}
          isDriver={isOwner}
        />
      ) : (
        ride.route_encoded_polyline && (
          <RouteMap
            encodedPolyline={ride.route_encoded_polyline}
            originLat={originLat}
            originLng={originLng}
            destLat={destLat}
            destLng={destLng}
          />
        )
      )}

      {/* Trip info */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-5">
        <h2 className="mb-3 text-base font-semibold text-text-main">
          {t("rideDetail.tripDetails")}
        </h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {ride.distance_meters && (
            <div className="rounded-lg bg-primary/5 px-3 py-1.5">
              <span className="text-text-secondary">{t("rideDetail.distance")}: </span>
              <span className="font-medium text-text-main">
                {formatDistance(ride.distance_meters)}
              </span>
            </div>
          )}
          {ride.duration_seconds && (
            <div className="rounded-lg bg-primary/5 px-3 py-1.5">
              <span className="text-text-secondary">{t("rideDetail.duration")}: </span>
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
          <h2 className="text-base font-semibold text-text-main">{t("rideDetail.price")}</h2>
          <span className="text-2xl font-bold text-primary">
            {formatPrice(ride.price_czk)}
          </span>
        </div>
      </section>

      {/* Driver section */}
      {profile && (
        <section className="rounded-2xl border border-border-pastel bg-surface p-5">
          <h2 className="mb-3 text-base font-semibold text-text-main">
            {t("rideDetail.driver")}
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
            {t("rideDetail.vehicle")}
          </h2>
          <div className="flex items-center gap-4">
            {vehicle.photo_url ? (
              <img
                src={vehicle.photo_url}
                alt={`${vehicle.make} ${vehicle.model}`}
                className="h-16 w-24 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-primary/5">
                <CarIcon className="h-8 w-8 text-primary" />
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
              {t("rideDetail.preferences")}
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
                        ? "bg-success/10 text-success dark:bg-success/20"
                        : "bg-background text-text-secondary line-through"
                    }`}
                  >
                    {icon}
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
            {t("rideDetail.notes")}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-text-secondary">
            {ride.notes}
          </p>
        </section>
      )}

      {/* Booking section -- sticky on mobile for easy access */}
      <section className="sticky bottom-0 z-40 bg-surface p-4 border-t border-border-pastel md:static md:border-t-0 md:p-5 md:rounded-2xl md:border md:border-border-pastel">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-main">
              {t("rideDetail.booking")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t("rideDetail.seatsAvailable", {
                available: ride.seats_available,
                total: ride.seats_total,
                seats: seatWord(ride.seats_available),
              })}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              ride.booking_mode === "instant"
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning"
            }`}
          >
            {ride.booking_mode === "instant" ? t("rideDetail.instant") : t("rideDetail.request")}
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
              {t("rideDetail.cancelBooking")}
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
                {t("rideDetail.manageBookings")}
              </span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                  {pendingCount}{" "}
                  {pendingCount === 1
                    ? t("rideDetail.pendingRequest")
                    : t("rideDetail.pendingRequests")}
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

      {/* Live location sharing for driver */}
      {canShareLocation && (
        <section className="rounded-2xl border border-border-pastel bg-surface p-5">
          <h2 className="mb-3 text-base font-semibold text-text-main">
            {t("rideDetail.liveLocation")}
          </h2>
          {!liveLocationEnabled || !isSharing ? (
            <button
              onClick={handleShareLocation}
              disabled={isStartingRide}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
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
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {isStartingRide ? t("rideDetail.starting") : t("rideDetail.shareMyLocation")}
            </button>
          ) : (
            <button
              onClick={() => {
                stopSharing();
                setLiveLocationEnabled(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 px-6 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              {t("rideDetail.stopSharing")}
            </button>
          )}
        </section>
      )}

      {/* Passenger live location banner (when ride in_progress but no driver position yet) */}
      {!isOwner &&
        passengerAutoEnabled &&
        !driverPosition && (
          <section className="rounded-2xl border border-border-pastel bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="font-medium">
                {t("rideDetail.waitingForDriver")}
              </span>
            </div>
          </section>
        )}

      {/* Owner actions */}
      {isOwner &&
        (localRideStatus === RIDE_STATUS.upcoming ||
          localRideStatus === "in_progress") && (
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
                ? t("rideDetail.completing")
                : completeConfirm
                  ? t("rideDetail.confirmComplete")
                  : t("rideDetail.completeRide")}
            </button>
          ) : (
            isOwner &&
            !isPastDeparture && (
              <div
                className="w-full rounded-xl border border-gray-300 px-6 py-3 text-center font-semibold text-gray-400 cursor-not-allowed"
                title={t("rideDetail.cannotCompleteBefore", { date: formattedDate, time: formattedTime })}
              >
                {t("rideDetail.completeRide")}
                <span className="block text-xs font-normal mt-0.5">
                  {t("rideDetail.cannotCompleteBefore", { date: formattedDate, time: formattedTime })}
                </span>
              </div>
            )
          )}

          <div className="flex gap-3">
            <Link
              href={`/rides/${ride.id}/edit`}
              className="flex-1 rounded-xl border border-primary bg-surface px-6 py-3 text-center font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              {t("rideDetail.editRide")}
            </Link>
            <button
              onClick={() => {
                setCancelDialogType("ride");
                setCancelDialogId(ride.id);
              }}
              className="flex-1 rounded-xl border border-red-300 px-6 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              {t("rideDetail.cancelRide")}
            </button>
          </div>
        </div>
      )}

      {/* Rate this ride button (completed ride, not yet reviewed) */}
      {(rideStatus ?? ride.status) === RIDE_STATUS.completed &&
        !hasReviewed &&
        ratingBookingId &&
        !showRating && (
          <button
            onClick={() => setShowRating(true)}
            className="w-full rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
          >
            {t("rideDetail.rateThisRide")}
          </button>
        )}

      {/* Rating modal */}
      {showRating && ratingBookingId && ratingOtherUserName && (
        <RatingModal
          bookingId={ratingBookingId}
          otherUserName={ratingOtherUserName}
          otherUserAvatar={ratingOtherUserAvatar}
          isOpen={true}
          onClose={() => {
            setShowRating(false);
            // Remove justCompleted param from URL
            const url = new URL(window.location.href);
            url.searchParams.delete("justCompleted");
            window.history.replaceState({}, "", url.toString());
          }}
          onSubmitted={() => {
            setShowRating(false);
            setHasReviewed(true);
            // Remove justCompleted param from URL
            const url = new URL(window.location.href);
            url.searchParams.delete("justCompleted");
            window.history.replaceState({}, "", url.toString());
          }}
        />
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
