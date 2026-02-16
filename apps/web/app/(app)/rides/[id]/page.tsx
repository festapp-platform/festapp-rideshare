import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { getRideById, getRideWaypoints, getBookingsForRide, getExistingReview, type BookingStatus, SITE_URL, formatPrice } from "@festapp/shared";
import { createClient } from "@/lib/supabase/server";
import { RideDetail } from "../../components/ride-detail";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ justCompleted?: string }>;
}

/**
 * Parse a PostGIS point value (WKT or GeoJSON) to lat/lng.
 * Handles "POINT(lng lat)" text and {type:"Point",coordinates:[lng,lat]} objects.
 */
function parsePoint(value: unknown): { lat: number; lng: number } | null {
  if (!value) return null;

  // WKT string: "POINT(lng lat)" or "(lng,lat)"
  if (typeof value === "string") {
    const match = value.match(
      /POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i,
    );
    if (match) {
      return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
    }
    return null;
  }

  // GeoJSON object
  if (
    typeof value === "object" &&
    value !== null &&
    "coordinates" in value
  ) {
    const coords = (value as { coordinates: number[] }).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lng: coords[0], lat: coords[1] };
    }
  }

  return null;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: ride } = await getRideById(supabase, id);

  if (!ride) {
    return { title: "Ride Not Found" };
  }

  const departureDate = parseISO(ride.departure_time);
  const formattedDate = format(departureDate, "MMM d, yyyy 'at' h:mm a");
  const title = `${ride.origin_address} -> ${ride.destination_address}`;
  const description = `${formatPrice(ride.price_czk)}, ${ride.seats_available} ${ride.seats_available === 1 ? "seat" : "seats"} available, ${formattedDate}`;

  const publicUrl = ride.short_id
    ? `${SITE_URL}/ride/${ride.short_id}`
    : `/rides/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: publicUrl,
      type: "website",
    },
    alternates: {
      canonical: publicUrl,
    },
  };
}

export default async function RideDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { justCompleted } = await searchParams;
  const supabase = await createClient();

  const [{ data: ride }, { data: waypoints }, { data: bookings }] =
    await Promise.all([
      getRideById(supabase, id),
      getRideWaypoints(supabase, id),
      getBookingsForRide(supabase, id),
    ]);

  if (!ride) {
    notFound();
  }

  // Fetch driver reliability data server-side to avoid client waterfall
  const { data: reliabilityRows } = await supabase.rpc(
    "get_driver_reliability",
    { p_driver_id: ride.driver_id },
  );
  const driverReliability =
    reliabilityRows && reliabilityRows.length > 0 ? reliabilityRows[0] : null;

  // Determine ownership and current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;
  const isOwner = currentUserId === ride.driver_id;

  // Find current user's existing booking (if any)
  const currentUserBooking =
    currentUserId && bookings
      ? bookings.find(
          (b) =>
            b.passenger_id === currentUserId &&
            (b.status === "confirmed" || b.status === "pending"),
        ) ?? null
      : null;

  // Check if user has already reviewed this ride (for any booking)
  let hasExistingReview = false;
  let ratingBookingId: string | null = null;
  let ratingOtherUserName: string | null = null;
  let ratingOtherUserAvatar: string | null = null;

  if (currentUserId && ride.status === "completed") {
    // Find the booking for the current user (confirmed only, since ride is completed)
    const userBooking = bookings?.find(
      (b) =>
        (b.passenger_id === currentUserId && b.status === "completed") ||
        (b.passenger_id === currentUserId && b.status === "confirmed"),
    );

    if (userBooking) {
      const { data: existingReview } = await getExistingReview(
        supabase,
        userBooking.id,
        currentUserId,
      );
      hasExistingReview = !!existingReview;
      ratingBookingId = userBooking.id;
      // The other user is the driver
      ratingOtherUserName = ride.profiles?.display_name ?? "Driver";
      ratingOtherUserAvatar = ride.profiles?.avatar_url ?? null;
    } else if (isOwner) {
      // Driver can rate each passenger - find first unreviewed booking
      const confirmedBookings = bookings?.filter(
        (b) => b.status === "completed" || b.status === "confirmed",
      ) ?? [];
      for (const booking of confirmedBookings) {
        const { data: existingReview } = await getExistingReview(
          supabase,
          booking.id,
          currentUserId,
        );
        if (!existingReview) {
          ratingBookingId = booking.id;
          ratingOtherUserName = booking.profiles?.display_name ?? "Passenger";
          ratingOtherUserAvatar = booking.profiles?.avatar_url ?? null;
          break;
        }
      }
      hasExistingReview = !ratingBookingId;
    }
  }

  // Parse coordinates from PostGIS geography columns
  const origin = parsePoint(ride.origin_location);
  const dest = parsePoint(ride.destination_location);

  const showRatingModal =
    justCompleted === "true" &&
    !hasExistingReview &&
    ratingBookingId !== null;

  return (
    <div className="mx-auto max-w-2xl">
      <RideDetail
        ride={ride as Parameters<typeof RideDetail>[0]["ride"]}
        isOwner={isOwner}
        waypoints={(waypoints ?? []) as Parameters<typeof RideDetail>[0]["waypoints"]}
        originLat={origin?.lat ?? 50.08}
        originLng={origin?.lng ?? 14.43}
        destLat={dest?.lat ?? 49.19}
        destLng={dest?.lng ?? 16.61}
        bookings={(bookings ?? []) as Parameters<typeof RideDetail>[0]["bookings"]}
        currentUserBooking={
          currentUserBooking
            ? {
                id: currentUserBooking.id,
                status: currentUserBooking.status as BookingStatus,
                seats_booked: currentUserBooking.seats_booked,
              }
            : null
        }
        currentUserId={currentUserId}
        driverReliability={driverReliability}
        showRatingModal={showRatingModal}
        ratingBookingId={ratingBookingId}
        ratingOtherUserName={ratingOtherUserName}
        ratingOtherUserAvatar={ratingOtherUserAvatar}
        hasExistingReview={hasExistingReview}
        rideStatus={ride.status}
      />
    </div>
  );
}
