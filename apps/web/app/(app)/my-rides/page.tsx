"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  getDriverRides,
  getPassengerBookings,
  RIDE_STATUS,
  BOOKING_STATUS,
  formatPrice,
} from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { RideStatusBadge } from "../components/ride-status-badge";
import { CancellationDialog } from "../components/cancellation-dialog";
import { Car, Backpack } from "lucide-react";

type RideRow = {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  price_czk: number | null;
  status: string;
  booking_mode?: string;
};

type PassengerBookingRow = {
  id: string;
  seats_booked: number;
  status: string;
  rides: {
    id: string;
    origin_address: string;
    destination_address: string;
    departure_time: string;
    seats_total: number;
    seats_available: number;
    price_czk: number | null;
    status: string;
    driver_id: string;
    profiles: {
      display_name: string;
      avatar_url: string | null;
      rating_avg: number;
    } | null;
  } | null;
};

type TopTab = "driver" | "passenger";

function BookingStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const bookingStatusConfig: Record<string, { label: string; className: string }> = {
    [BOOKING_STATUS.pending]: { label: t("booking.pending"), className: "bg-amber-100 text-amber-700" },
    [BOOKING_STATUS.confirmed]: { label: t("booking.confirmed"), className: "bg-green-100 text-green-700" },
    [BOOKING_STATUS.cancelled]: { label: t("booking.cancelled"), className: "bg-red-100 text-red-700" },
    [BOOKING_STATUS.completed]: { label: t("rides.complete"), className: "bg-blue-100 text-blue-700" },
  };
  const config = bookingStatusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

/**
 * My Rides page showing both driver rides and passenger bookings
 * with top-level tabs (As Driver / As Passenger) and a single merged list
 * (upcoming ascending first, then past descending).
 */
export default function MyRidesPage() {
  const supabase = createClient();
  const { t } = useI18n();
  const [rides, setRides] = useState<RideRow[]>([]);
  const [bookings, setBookings] = useState<PassengerBookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topTab, setTopTab] = useState<TopTab>("driver");
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const [driverResult, passengerResult] = await Promise.all([
        getDriverRides(supabase, user.id),
        getPassengerBookings(supabase, user.id),
      ]);

      if (driverResult.data) setRides(driverResult.data as RideRow[]);
      if (passengerResult.data)
        setBookings(passengerResult.data as PassengerBookingRow[]);
      setIsLoading(false);
    }
    fetchData();
  }, [supabase]);

  // Driver rides: upcoming ascending, then past descending
  const upcomingDriverRides = rides
    .filter(
      (r) =>
        r.status === RIDE_STATUS.upcoming ||
        r.status === RIDE_STATUS.in_progress,
    )
    .sort(
      (a, b) =>
        new Date(a.departure_time).getTime() -
        new Date(b.departure_time).getTime(),
    );

  const pastDriverRides = rides
    .filter(
      (r) =>
        r.status === RIDE_STATUS.completed ||
        r.status === RIDE_STATUS.cancelled,
    )
    .sort(
      (a, b) =>
        new Date(b.departure_time).getTime() -
        new Date(a.departure_time).getTime(),
    );

  // Passenger bookings: upcoming ascending, then past descending
  const upcomingPassengerBookings = bookings
    .filter((b) => {
      const rideStatus = b.rides?.status;
      const isUpcomingRide =
        rideStatus === RIDE_STATUS.upcoming ||
        rideStatus === RIDE_STATUS.in_progress;
      const isActiveBooking =
        b.status === BOOKING_STATUS.pending ||
        b.status === BOOKING_STATUS.confirmed;
      return isUpcomingRide && isActiveBooking;
    })
    .sort(
      (a, b) =>
        new Date(a.rides?.departure_time ?? 0).getTime() -
        new Date(b.rides?.departure_time ?? 0).getTime(),
    );

  const pastPassengerBookings = bookings
    .filter((b) => {
      const rideStatus = b.rides?.status;
      const isCompletedRide =
        rideStatus === RIDE_STATUS.completed ||
        rideStatus === RIDE_STATUS.cancelled;
      const isCancelledBooking =
        b.status === BOOKING_STATUS.cancelled ||
        b.status === BOOKING_STATUS.completed;
      return isCompletedRide || isCancelledBooking;
    })
    .sort(
      (a, b) =>
        new Date(b.rides?.departure_time ?? 0).getTime() -
        new Date(a.rides?.departure_time ?? 0).getTime(),
    );

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-text-main">{t("myRides.title")}</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-border-pastel bg-surface"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">{t("myRides.title")}</h1>

      {/* Top-level tabs: As Driver / As Passenger */}
      <div className="mb-6 flex gap-1 rounded-xl bg-background p-1">
        <button
          onClick={() => setTopTab("driver")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            topTab === "driver"
              ? "bg-surface text-text-main shadow-sm"
              : "text-text-secondary hover:text-text-main"
          }`}
        >
          {t("myRides.asDriver")}
        </button>
        <button
          onClick={() => setTopTab("passenger")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            topTab === "passenger"
              ? "bg-surface text-text-main shadow-sm"
              : "text-text-secondary hover:text-text-main"
          }`}
        >
          {t("myRides.asPassenger")}
        </button>
      </div>

      {/* Content: single merged list per tab */}
      {topTab === "driver" ? (
        <DriverRidesList
          upcomingRides={upcomingDriverRides}
          pastRides={pastDriverRides}
        />
      ) : (
        <PassengerBookingsList
          upcomingBookings={upcomingPassengerBookings}
          pastBookings={pastPassengerBookings}
          onCancelBooking={setCancelBookingId}
        />
      )}

      {/* Cancellation dialog for passenger bookings */}
      {cancelBookingId && (
        <CancellationDialog
          type="booking"
          id={cancelBookingId}
          isOpen={true}
          onClose={() => setCancelBookingId(null)}
          onCancelled={() => {
            // Re-fetch bookings after cancellation
            setCancelBookingId(null);
            setIsLoading(true);
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (!user) {
                setIsLoading(false);
                return;
              }
              getPassengerBookings(supabase, user.id).then(({ data }) => {
                if (data) setBookings(data as PassengerBookingRow[]);
                setIsLoading(false);
              });
            });
          }}
        />
      )}
    </div>
  );
}

/* --- Driver Rides List --- */

function DriverRidesList({
  upcomingRides,
  pastRides,
}: {
  upcomingRides: RideRow[];
  pastRides: RideRow[];
}) {
  const { t } = useI18n();
  const hasAny = upcomingRides.length > 0 || pastRides.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border-pastel bg-surface p-12">
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Car className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-text-main">
          {t("myRides.noUpcomingRides")}
        </h2>
        <p className="mb-4 text-sm text-text-secondary">
          {t("myRides.postRideHint")}
        </p>
        <Link
          href="/rides/new"
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-primary/90"
        >
          {t("myRides.postARide")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {upcomingRides.map((ride) => (
        <DriverRideCard key={ride.id} ride={ride} />
      ))}

      {upcomingRides.length > 0 && pastRides.length > 0 && (
        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-border-pastel" />
          <span className="text-xs font-medium text-text-secondary">
            {t("myRides.pastRides")}
          </span>
          <div className="h-px flex-1 bg-border-pastel" />
        </div>
      )}

      {pastRides.map((ride) => (
        <DriverRideCard key={ride.id} ride={ride} />
      ))}
    </div>
  );
}

function DriverRideCard({ ride }: { ride: RideRow }) {
  const { t } = useI18n();
  const departure = parseISO(ride.departure_time);
  const formattedTime = format(departure, "EEE, MMM d 'at' h:mm a");

  return (
    <Link
      key={ride.id}
      href={`/rides/${ride.id}`}
      className="block rounded-2xl border border-border-pastel bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-main">
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
          <p className="text-xs text-text-secondary">{formattedTime}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
            <span>
              {ride.seats_available}/{ride.seats_total} {t("myRides.seats")}
            </span>
            <span className="font-medium text-primary">
              {formatPrice(ride.price_czk)}
            </span>
          </div>
        </div>
        <RideStatusBadge status={ride.status} />
      </div>
    </Link>
  );
}

/* --- Passenger Bookings List --- */

function PassengerBookingsList({
  upcomingBookings,
  pastBookings,
  onCancelBooking,
}: {
  upcomingBookings: PassengerBookingRow[];
  pastBookings: PassengerBookingRow[];
  onCancelBooking: (bookingId: string) => void;
}) {
  const { t } = useI18n();
  const hasAny = upcomingBookings.length > 0 || pastBookings.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border-pastel bg-surface p-12">
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Backpack className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-text-main">
          {t("myRides.noUpcomingRidesPassenger")}
        </h2>
        <p className="mb-4 text-sm text-text-secondary">
          {t("myRides.searchHint")}
        </p>
        <Link
          href="/search"
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-primary/90"
        >
          {t("myRides.searchForARide")}
        </Link>
      </div>
    );
  }

  const seatWord = (count: number) =>
    count === 1 ? t("myRides.seatSingular") : t("myRides.seatPlural");

  return (
    <div className="space-y-3">
      {upcomingBookings.map((booking) => (
        <PassengerBookingCard
          key={booking.id}
          booking={booking}
          canCancel={
            booking.status === BOOKING_STATUS.pending ||
            booking.status === BOOKING_STATUS.confirmed
          }
          onCancelBooking={onCancelBooking}
        />
      ))}

      {upcomingBookings.length > 0 && pastBookings.length > 0 && (
        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-border-pastel" />
          <span className="text-xs font-medium text-text-secondary">
            {t("myRides.pastRides")}
          </span>
          <div className="h-px flex-1 bg-border-pastel" />
        </div>
      )}

      {pastBookings.map((booking) => (
        <PassengerBookingCard
          key={booking.id}
          booking={booking}
          canCancel={false}
          onCancelBooking={onCancelBooking}
        />
      ))}
    </div>
  );
}

function PassengerBookingCard({
  booking,
  canCancel,
  onCancelBooking,
}: {
  booking: PassengerBookingRow;
  canCancel: boolean;
  onCancelBooking: (bookingId: string) => void;
}) {
  const { t } = useI18n();
  const ride = booking.rides;
  if (!ride) return null;

  const departure = parseISO(ride.departure_time);
  const formattedTime = format(departure, "EEE, MMM d 'at' h:mm a");
  const driverProfile = ride.profiles;

  const seatWord = (count: number) =>
    count === 1 ? t("myRides.seatSingular") : t("myRides.seatPlural");

  return (
    <div
      className="rounded-2xl border border-border-pastel bg-surface p-4 shadow-sm"
    >
      <Link
        href={`/rides/${ride.id}`}
        className="block transition-opacity hover:opacity-80"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-main">
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
              <span className="truncate">
                {ride.destination_address}
              </span>
            </div>
            <p className="text-xs text-text-secondary">{formattedTime}</p>

            {/* Driver info */}
            {driverProfile && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {driverProfile.avatar_url ? (
                    <img
                      src={driverProfile.avatar_url}
                      alt={driverProfile.display_name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    driverProfile.display_name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-xs text-text-secondary">
                  {driverProfile.display_name}
                </span>
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
              <span>
                {booking.seats_booked}{" "}
                {seatWord(booking.seats_booked)}
              </span>
              <span className="font-medium text-primary">
                {formatPrice(ride.price_czk)}
              </span>
            </div>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>
      </Link>

      {canCancel && (
        <button
          onClick={() => onCancelBooking(booking.id)}
          className="mt-3 w-full rounded-xl border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          {t("myRides.cancelBooking")}
        </button>
      )}
    </div>
  );
}
