import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getRideByShortId } from "@/lib/short-id";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@festapp/shared";

interface PageProps {
  params: Promise<{ shortId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { shortId } = await params;
  const supabase = await createClient();
  const { data: ride } = await getRideByShortId(supabase, shortId);

  if (!ride) {
    return { title: "Ride Not Found | spolujizda.online" };
  }

  const departureDate = parseISO(ride.departure_time);
  const formattedDate = format(departureDate, "MMM d, yyyy 'at' h:mm a");
  const title = `${ride.origin_address} -> ${ride.destination_address} | ${SITE_NAME}`;
  const description = `${ride.price_czk != null ? `${ride.price_czk} CZK` : "Free"}, ${ride.seats_available} ${ride.seats_available === 1 ? "seat" : "seats"} available, ${formattedDate}`;
  const url = `${SITE_URL}/ride/${shortId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function PublicRidePage({ params }: PageProps) {
  const { shortId } = await params;
  const supabase = await createClient();
  const { data: ride } = await getRideByShortId(supabase, shortId);

  if (!ride) {
    notFound();
  }

  const departureDate = parseISO(ride.departure_time);
  const formattedDate = format(departureDate, "EEEE, MMM d, yyyy");
  const formattedTime = format(departureDate, "h:mm a");
  const driverName = ride.profiles?.display_name ?? "Driver";
  const driverRating = ride.profiles?.rating_avg ?? 0;
  const driverRatingCount = ride.profiles?.rating_count ?? 0;
  const vehicle = ride.vehicles;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Route header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {ride.origin_address}
        </h1>
        <div className="my-2 flex items-center text-gray-400">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {ride.destination_address}
        </h1>
      </div>

      {/* Date and time */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">{formattedDate}</p>
            <p className="text-sm text-gray-500">Departure at {formattedTime}</p>
          </div>
        </div>
      </div>

      {/* Ride details */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {ride.price_czk != null ? `${ride.price_czk}` : "Free"}
          </p>
          <p className="text-xs text-gray-500">
            {ride.price_czk != null ? "CZK" : "ride"}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {ride.seats_available}
          </p>
          <p className="text-xs text-gray-500">
            {ride.seats_available === 1 ? "seat left" : "seats left"}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 capitalize">
            {ride.booking_mode}
          </p>
          <p className="text-xs text-gray-500">booking</p>
        </div>
      </div>

      {/* Driver info */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="flex items-center gap-3">
          {ride.profiles?.avatar_url ? (
            <img
              src={ride.profiles.avatar_url}
              alt={driverName}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-medium text-gray-600">
              {driverName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{driverName}</p>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              {driverRatingCount > 0 ? (
                <>
                  <span className="text-yellow-500">&#9733;</span>
                  <span>
                    {Number(driverRating).toFixed(1)} ({driverRatingCount}{" "}
                    {driverRatingCount === 1 ? "review" : "reviews"})
                  </span>
                </>
              ) : (
                <span>New driver</span>
              )}
            </div>
          </div>
        </div>
        {vehicle && (
          <p className="mt-2 text-sm text-gray-500">
            {vehicle.color} {vehicle.make} {vehicle.model}
            {vehicle.license_plate ? ` (${vehicle.license_plate})` : ""}
          </p>
        )}
      </div>

      {/* Notes */}
      {ride.notes && (
        <div className="mb-6 rounded-lg border bg-white p-4">
          <p className="mb-1 text-sm font-medium text-gray-700">Notes</p>
          <p className="text-sm text-gray-600">{ride.notes}</p>
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/rides/${ride.id}`}
        className="block w-full rounded-lg bg-gray-900 py-3 text-center font-medium text-white hover:bg-gray-800 transition-colors"
      >
        Book this ride
      </Link>
    </div>
  );
}
