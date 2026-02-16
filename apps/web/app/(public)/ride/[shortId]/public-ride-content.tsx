"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { formatPrice } from "@festapp/shared";

interface PublicRideContentProps {
  ride: {
    id: string;
    origin_address: string;
    destination_address: string;
    price_czk: number | null;
    seats_available: number;
    booking_mode: string;
    notes: string | null;
    profiles: {
      display_name: string | null;
      avatar_url: string | null;
      rating_avg: number | null;
      rating_count: number | null;
    } | null;
    vehicles: {
      color: string | null;
      make: string | null;
      model: string | null;
      license_plate: string | null;
    } | null;
  };
  formattedDate: string;
  formattedTime: string;
}

export function PublicRideContent({
  ride,
  formattedDate,
  formattedTime,
}: PublicRideContentProps) {
  const { t } = useI18n();

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
            <p className="text-sm text-gray-500">
              {t("publicRide.departureAt", { time: formattedTime })}
            </p>
          </div>
        </div>
      </div>

      {/* Ride details */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(ride.price_czk)}
          </p>
          <p className="text-xs text-gray-500">
            {ride.price_czk != null ? t("publicRide.perSeat") : t("publicRide.ride")}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {ride.seats_available}
          </p>
          <p className="text-xs text-gray-500">
            {ride.seats_available === 1 ? t("publicRide.seatLeft") : t("publicRide.seatsLeft")}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 capitalize">
            {ride.booking_mode}
          </p>
          <p className="text-xs text-gray-500">{t("publicRide.booking")}</p>
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
                    {driverRatingCount === 1 ? t("publicRide.review") : t("publicRide.reviews")})
                  </span>
                </>
              ) : (
                <span>{t("publicRide.newDriver")}</span>
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
          <p className="mb-1 text-sm font-medium text-gray-700">{t("publicRide.notes")}</p>
          <p className="text-sm text-gray-600">{ride.notes}</p>
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/rides/${ride.id}`}
        className="block w-full rounded-lg bg-gray-900 py-3 text-center font-medium text-white hover:bg-gray-800 transition-colors"
      >
        {t("publicRide.bookThisRide")}
      </Link>
    </div>
  );
}
