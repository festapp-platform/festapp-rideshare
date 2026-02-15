'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PRICING, calculateSuggestedPrice } from '@festapp/shared';
import {
  AddressInput,
  type PlaceResult,
} from '../../../components/address-input';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
] as const;

interface RouteInfo {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  suggestedPriceCzk: number;
}

/**
 * Recurring ride pattern creation page (RIDE-13).
 *
 * Creates a recurring_ride_pattern entry. The pg_cron job from plan 03-01
 * auto-generates ride instances from active patterns.
 */
export default function RecurringRidePage() {
  const router = useRouter();
  const supabase = createClient();

  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isComputingRoute, setIsComputingRoute] = useState(false);

  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [departureTime, setDepartureTime] = useState('08:00');
  const [seatsTotal, setSeatsTotal] = useState(4);
  const [priceCzk, setPriceCzk] = useState<number | null>(null);
  const [bookingMode, setBookingMode] = useState<'instant' | 'request'>('request');
  const [generateWeeksAhead, setGenerateWeeksAhead] = useState(2);
  const [vehicleId, setVehicleId] = useState('');
  const [vehicles, setVehicles] = useState<
    { id: string; make: string; model: string }[]
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch vehicles
  useEffect(() => {
    async function fetchVehicles() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('vehicles')
        .select('id, make, model')
        .eq('owner_id', user.id)
        .order('is_primary', { ascending: false });

      if (data) setVehicles(data);
    }
    fetchVehicles();
  }, [supabase]);

  // Compute route when both locations set
  useEffect(() => {
    if (!origin || !destination) return;

    async function computeRoute() {
      setIsComputingRoute(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          'compute-route',
          {
            body: {
              originLat: origin!.lat,
              originLng: origin!.lng,
              destLat: destination!.lat,
              destLng: destination!.lng,
            },
          },
        );

        if (error) throw error;
        setRouteInfo(data);
        setPriceCzk(data.suggestedPriceCzk);
      } catch {
        // Fallback: estimate from haversine
        const R = 6371000;
        const dLat = ((destination!.lat - origin!.lat) * Math.PI) / 180;
        const dLng = ((destination!.lng - origin!.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((origin!.lat * Math.PI) / 180) *
            Math.cos((destination!.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c * 1.3;
        const pricing = calculateSuggestedPrice(dist);
        setPriceCzk(pricing.suggested);
      } finally {
        setIsComputingRoute(false);
      }
    }

    computeRoute();
  }, [origin, destination, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination) {
      setError('Please select both origin and destination.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in.');
        return;
      }

      // Build WKT LINESTRING from encoded polyline if available
      let routeGeometry: string | null = null;
      if (routeInfo?.encodedPolyline) {
        // Dynamic import to avoid bundling polyline-codec on page load
        const { decode } = await import('@googlemaps/polyline-codec');
        const points = decode(routeInfo.encodedPolyline);
        const coords = points.map(([lat, lng]: [number, number]) => `${lng} ${lat}`).join(', ');
        routeGeometry = `LINESTRING(${coords})`;
      }

      const { error: insertError } = await supabase
        .from('recurring_ride_patterns')
        .insert({
          driver_id: user.id,
          origin_location: `POINT(${origin.lng} ${origin.lat})`,
          origin_address: origin.address,
          destination_location: `POINT(${destination.lng} ${destination.lat})`,
          destination_address: destination.address,
          route_geometry: routeGeometry,
          route_encoded_polyline: routeInfo?.encodedPolyline ?? null,
          day_of_week: dayOfWeek,
          departure_time: departureTime,
          seats_total: seatsTotal,
          price_czk: priceCzk,
          booking_mode: bookingMode,
          generate_weeks_ahead: generateWeeksAhead,
          vehicle_id: vehicleId || null,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recurring ride.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-text-main">
          Recurring Ride Created!
        </h2>
        <p className="mb-6 text-sm text-text-secondary">
          Rides will be automatically generated for the next {generateWeeksAhead}{' '}
          {generateWeeksAhead === 1 ? 'week' : 'weeks'} every{' '}
          {DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label} at{' '}
          {departureTime}.
        </p>
        <Link
          href="/my-rides"
          className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          View My Rides
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-text-main">
        Create Recurring Ride
      </h1>
      <p className="mb-6 text-sm text-text-secondary">
        Set up a weekly ride pattern. Rides will be automatically generated on
        your schedule.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Route */}
        <section className="rounded-2xl border border-border-pastel bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-main">Route</h2>
          <div className="space-y-3">
            <AddressInput
              label="From"
              placeholder="Pickup location"
              onPlaceSelect={setOrigin}
            />
            <AddressInput
              label="To"
              placeholder="Destination"
              onPlaceSelect={setDestination}
            />
          </div>
          {isComputingRoute && (
            <p className="mt-3 text-sm text-text-secondary">
              Computing route...
            </p>
          )}
          {routeInfo && (
            <div className="mt-3 flex gap-3 text-sm">
              <span className="rounded-lg bg-primary/5 px-3 py-1.5 text-text-main">
                {(routeInfo.distanceMeters / 1000).toFixed(1)} km
              </span>
              <span className="rounded-lg bg-primary/5 px-3 py-1.5 text-text-main">
                {Math.round(routeInfo.durationSeconds / 60)} min
              </span>
            </div>
          )}
        </section>

        {/* Schedule */}
        <section className="rounded-2xl border border-border-pastel bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-main">
            Schedule
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="dayOfWeek"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                Day of week
              </label>
              <select
                id="dayOfWeek"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="departureTime"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                Departure time
              </label>
              <input
                id="departureTime"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="generateWeeks"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                Generate weeks ahead
              </label>
              <input
                id="generateWeeks"
                type="number"
                min={1}
                max={4}
                value={generateWeeksAhead}
                onChange={(e) =>
                  setGenerateWeeksAhead(
                    Math.min(4, Math.max(1, Number(e.target.value))),
                  )
                }
                className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-text-secondary">
                Rides are auto-generated up to {generateWeeksAhead}{' '}
                {generateWeeksAhead === 1 ? 'week' : 'weeks'} in advance
              </p>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="rounded-2xl border border-border-pastel bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-main">
            Details
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="seats"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                Available seats
              </label>
              <input
                id="seats"
                type="number"
                min={1}
                max={8}
                value={seatsTotal}
                onChange={(e) => setSeatsTotal(Number(e.target.value))}
                className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="price"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                Price ({PRICING.CURRENCY_SYMBOL})
              </label>
              <input
                id="price"
                type="number"
                min={0}
                value={priceCzk ?? ''}
                onChange={(e) =>
                  setPriceCzk(e.target.value ? Number(e.target.value) : null)
                }
                placeholder={
                  routeInfo
                    ? `Suggested: ${routeInfo.suggestedPriceCzk}`
                    : 'Enter price'
                }
                className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Booking mode */}
            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm font-medium text-text-main">
                Booking mode
              </span>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="bookingMode"
                    value="instant"
                    checked={bookingMode === 'instant'}
                    onChange={() => setBookingMode('instant')}
                    className="accent-primary"
                  />
                  <span className="text-sm text-text-main">Instant booking</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="bookingMode"
                    value="request"
                    checked={bookingMode === 'request'}
                    onChange={() => setBookingMode('request')}
                    className="accent-primary"
                  />
                  <span className="text-sm text-text-main">Request to book</span>
                </label>
              </div>
            </div>

            {/* Vehicle */}
            {vehicles.length > 0 && (
              <div className="sm:col-span-2">
                <label
                  htmlFor="vehicle"
                  className="mb-1 block text-sm font-medium text-text-main"
                >
                  Vehicle (optional)
                </label>
                <select
                  id="vehicle"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !origin || !destination}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Recurring Ride'}
        </button>
      </form>

      {/* Link back to single ride */}
      <div className="mt-4 text-center">
        <Link
          href="/rides/new"
          className="text-sm text-primary hover:underline"
        >
          Post a single ride instead
        </Link>
      </div>
    </div>
  );
}
