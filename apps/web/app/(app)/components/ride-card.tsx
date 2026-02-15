'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import type { NearbyRideResult } from '@festapp/shared';

/**
 * Ride result card displaying driver info, route, pricing, and availability.
 *
 * Used in search results to show rides matched by the nearby_rides RPC.
 * Entire card is a clickable link to the ride detail page.
 */

interface RideCardProps {
  ride: NearbyRideResult;
}

export function RideCard({ ride }: RideCardProps) {
  const departureDate = parseISO(ride.departure_time);
  const formattedTime = format(departureDate, "EEE, MMM d 'at' h:mm a");
  const originDistanceKm = ride.origin_distance_m
    ? (ride.origin_distance_m / 1000).toFixed(1)
    : null;

  return (
    <Link
      href={`/rides/${ride.ride_id}`}
      className="block rounded-2xl border border-border-pastel bg-surface p-4 shadow-sm transition-shadow hover:shadow-md md:p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
        {/* Driver info */}
        <div className="flex items-center gap-3 md:w-48 md:flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {ride.driver_avatar ? (
              <img
                src={ride.driver_avatar}
                alt={ride.driver_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              ride.driver_name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-text-main">
              {ride.driver_name}
            </p>
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <svg
                className="h-3.5 w-3.5 text-warning"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>
                {ride.driver_rating.toFixed(1)}
                {ride.driver_rating_count > 0 && (
                  <span className="ml-0.5">({ride.driver_rating_count})</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Route and details */}
        <div className="flex-1">
          {/* Route */}
          <div className="mb-2 flex items-center gap-2 text-sm text-text-main">
            <span className="truncate font-medium">{ride.origin_address}</span>
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
            <span className="truncate font-medium">
              {ride.destination_address}
            </span>
          </div>

          {/* Departure time */}
          <p className="mb-2 text-sm text-text-secondary">{formattedTime}</p>

          {/* Details row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
            {/* Seats */}
            <span className="flex items-center gap-1">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {ride.seats_available} {ride.seats_available === 1 ? 'seat' : 'seats'} left
            </span>

            {/* Vehicle */}
            {ride.vehicle_make && ride.vehicle_model && (
              <span className="flex items-center gap-1">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 17h8M8 17v-4m8 4v-4m-8 0h8m-8 0l-2-6h12l-2 6"
                  />
                </svg>
                {ride.vehicle_make} {ride.vehicle_model}
                {ride.vehicle_color && ` (${ride.vehicle_color})`}
              </span>
            )}

            {/* Distance from pickup */}
            {originDistanceKm && (
              <span>{originDistanceKm} km from your pickup</span>
            )}
          </div>
        </div>

        {/* Price and booking mode */}
        <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-2">
          <span className="text-lg font-bold text-primary">
            {ride.price_czk != null ? `${ride.price_czk} CZK` : 'Free'}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              ride.booking_mode === 'instant'
                ? 'bg-success/15 text-success'
                : 'bg-warning/15 text-warning'
            }`}
          >
            {ride.booking_mode === 'instant' ? 'Instant' : 'Request'}
          </span>
        </div>
      </div>
    </Link>
  );
}
