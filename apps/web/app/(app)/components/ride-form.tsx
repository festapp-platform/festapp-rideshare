"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  CreateRideSchema,
  type CreateRide,
  PRICING,
  calculateSuggestedPrice,
} from "@festapp/shared";
import { createRide } from "@festapp/shared";
import { decode as decodePolyline } from "@googlemaps/polyline-codec";
import { createClient } from "@/lib/supabase/client";
import {
  AddressAutocomplete,
  type PlaceResult,
} from "./address-autocomplete";
import { RideMap } from "./ride-map";

interface RouteInfo {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  suggestedPriceCzk: number;
  priceMinCzk: number;
  priceMaxCzk: number;
}

/**
 * Ride posting form with:
 * - Dual address autocomplete (origin/destination)
 * - Route computation via compute-route Edge Function
 * - Map display with route polyline
 * - Price suggestion with adjustable slider
 * - All ride fields (seats, luggage, booking mode, notes, vehicle)
 * - Zod validation via CreateRideSchema
 * - Database insertion via Supabase
 */
export function RideForm() {
  const router = useRouter();
  const supabase = createClient();

  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isComputingRoute, setIsComputingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<
    { id: string; make: string; model: string }[]
  >([]);

  // Get tomorrow as default minimum date
  const now = new Date();
  const minDatetime = new Date(now.getTime() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const form = useForm<CreateRide>({
    resolver: zodResolver(CreateRideSchema),
    defaultValues: {
      seatsTotal: 4,
      luggageSize: "medium",
      bookingMode: "request",
      notes: "",
    },
  });

  // Fetch user's vehicles
  useEffect(() => {
    async function fetchVehicles() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("vehicles")
        .select("id, make, model")
        .eq("owner_id", user.id)
        .order("is_primary", { ascending: false });

      if (data) setVehicles(data);
    }
    fetchVehicles();
  }, [supabase]);

  // Compute route when both origin and destination are set
  useEffect(() => {
    if (!origin || !destination) return;

    // Update form values
    form.setValue("origin", origin);
    form.setValue("destination", destination);

    async function computeRoute() {
      setIsComputingRoute(true);
      setRouteError(null);

      try {
        const { data, error } = await supabase.functions.invoke(
          "compute-route",
          {
            body: {
              originLat: origin!.lat,
              originLng: origin!.lng,
              destLat: destination!.lat,
              destLng: destination!.lng,
            },
          },
        );

        if (error) {
          throw new Error(error.message || "Failed to compute route");
        }

        const route: RouteInfo = data;
        setRouteInfo(route);

        // Set suggested price as default
        form.setValue("priceCzk", route.suggestedPriceCzk);
      } catch (err) {
        setRouteError(
          err instanceof Error ? err.message : "Failed to compute route",
        );
        // Fall back to client-side price estimation if Edge Function fails
        if (origin && destination) {
          const straight = haversineDistance(
            origin.lat,
            origin.lng,
            destination.lat,
            destination.lng,
          );
          // Rough estimate: driving distance is ~1.3x straight-line
          const estDistance = straight * 1.3;
          const pricing = calculateSuggestedPrice(estDistance);
          form.setValue("priceCzk", pricing.suggested);
        }
      } finally {
        setIsComputingRoute(false);
      }
    }

    computeRoute();
  }, [origin, destination, supabase, form]);

  async function onSubmit(values: CreateRide) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSubmitError("You must be logged in to post a ride.");
        return;
      }

      // Build ride insert object
      // PostGIS geography columns accept WKT text like "POINT(lng lat)" which auto-casts
      const rideData = {
        driver_id: user.id,
        origin_location: `POINT(${values.origin.lng} ${values.origin.lat})`,
        origin_address: values.origin.address,
        destination_location: `POINT(${values.destination.lng} ${values.destination.lat})`,
        destination_address: values.destination.address,
        departure_time: new Date(values.departureTime).toISOString(),
        seats_total: values.seatsTotal,
        seats_available: values.seatsTotal,
        price_czk: values.priceCzk ?? null,
        suggested_price_czk: routeInfo?.suggestedPriceCzk ?? null,
        distance_meters: routeInfo?.distanceMeters ?? null,
        duration_seconds: routeInfo?.durationSeconds ?? null,
        route_encoded_polyline: routeInfo?.encodedPolyline ?? null,
        luggage_size: values.luggageSize,
        booking_mode: values.bookingMode,
        preferences: values.preferences ?? {},
        notes: values.notes ?? null,
        vehicle_id: values.vehicleId ?? null,
        // Build route geometry as WKT LINESTRING from encoded polyline
        ...(routeInfo?.encodedPolyline
          ? {
              route_geometry: encodedPolylineToWKT(routeInfo.encodedPolyline),
            }
          : {}),
      };

      // createRide returns a Postgrest query builder -- await it
      const { data: ride, error } = await createRide(
        supabase,
        rideData as Parameters<typeof createRide>[1],
      );

      if (error) {
        throw new Error(error.message || "Failed to create ride");
      }

      if (ride?.id) {
        router.push(`/rides/${ride.id}`);
      } else {
        router.push("/my-rides");
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create ride",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  function formatDistance(meters: number): string {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  }

  const priceRange = routeInfo
    ? { min: routeInfo.priceMinCzk, max: routeInfo.priceMaxCzk }
    : { min: PRICING.MIN_PRICE_CZK, max: 10000 };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Route Section */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-main">Route</h2>
        <div className="space-y-3">
          <AddressAutocomplete
            label="From"
            placeholder="Pickup location"
            onPlaceSelect={setOrigin}
          />
          <AddressAutocomplete
            label="To"
            placeholder="Destination"
            onPlaceSelect={setDestination}
          />
        </div>

        {/* Route computation loading */}
        {isComputingRoute && (
          <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
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
            Computing route...
          </div>
        )}

        {routeError && (
          <p className="mt-3 text-sm text-red-500">{routeError}</p>
        )}

        {/* Route info + Map */}
        {routeInfo && origin && destination && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                <span className="text-text-secondary">Distance: </span>
                <span className="font-medium text-text-main">
                  {formatDistance(routeInfo.distanceMeters)}
                </span>
              </div>
              <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                <span className="text-text-secondary">Duration: </span>
                <span className="font-medium text-text-main">
                  {formatDuration(routeInfo.durationSeconds)}
                </span>
              </div>
              <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                <span className="text-text-secondary">Suggested: </span>
                <span className="font-medium text-text-main">
                  {routeInfo.suggestedPriceCzk} {PRICING.CURRENCY_SYMBOL}
                </span>
              </div>
            </div>
            <RideMap
              encodedPolyline={routeInfo.encodedPolyline}
              originLat={origin.lat}
              originLng={origin.lng}
              destLat={destination.lat}
              destLng={destination.lng}
            />
          </div>
        )}
      </section>

      {/* Price Section */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-main">Price</h2>
        <div>
          <label
            htmlFor="price"
            className="mb-1 block text-sm font-medium text-text-main"
          >
            Price ({PRICING.CURRENCY_SYMBOL})
          </label>
          <Controller
            name="priceCzk"
            control={form.control}
            render={({ field }) => (
              <div className="space-y-2">
                <input
                  id="price"
                  type="range"
                  min={priceRange.min}
                  max={priceRange.max}
                  value={field.value ?? routeInfo?.suggestedPriceCzk ?? 0}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    {priceRange.min} {PRICING.CURRENCY_SYMBOL}
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {field.value ?? 0} {PRICING.CURRENCY_SYMBOL}
                  </span>
                  <span className="text-text-secondary">
                    {priceRange.max} {PRICING.CURRENCY_SYMBOL}
                  </span>
                </div>
              </div>
            )}
          />
          {routeInfo && (
            <p className="mt-1 text-xs text-text-secondary">
              Suggested: {routeInfo.suggestedPriceCzk} {PRICING.CURRENCY_SYMBOL}{" "}
              (based on fuel costs)
            </p>
          )}
          {form.formState.errors.priceCzk && (
            <p className="mt-1 text-xs text-red-500">
              {form.formState.errors.priceCzk.message}
            </p>
          )}
        </div>
      </section>

      {/* Details Section */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-main">Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Departure date/time */}
          <div className="sm:col-span-2">
            <label
              htmlFor="departureTime"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              Departure
            </label>
            <input
              id="departureTime"
              type="datetime-local"
              min={minDatetime}
              {...form.register("departureTime")}
              className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
            {form.formState.errors.departureTime && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.departureTime.message}
              </p>
            )}
          </div>

          {/* Seats */}
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
              {...form.register("seatsTotal", { valueAsNumber: true })}
              className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
            {form.formState.errors.seatsTotal && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.seatsTotal.message}
              </p>
            )}
          </div>

          {/* Luggage size */}
          <div>
            <label
              htmlFor="luggage"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              Luggage size
            </label>
            <select
              id="luggage"
              {...form.register("luggageSize")}
              className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="none">No luggage</option>
              <option value="small">Small (backpack)</option>
              <option value="medium">Medium (carry-on)</option>
              <option value="large">Large (suitcase)</option>
            </select>
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
                  value="instant"
                  {...form.register("bookingMode")}
                  className="accent-primary"
                />
                <span className="text-sm text-text-main">
                  Instant booking
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  value="request"
                  {...form.register("bookingMode")}
                  className="accent-primary"
                />
                <span className="text-sm text-text-main">
                  Request to book
                </span>
              </label>
            </div>
          </div>

          {/* Vehicle selection */}
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
                {...form.register("vehicleId")}
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

          {/* Notes */}
          <div className="sm:col-span-2">
            <label
              htmlFor="notes"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              Notes for passengers (optional)
            </label>
            <textarea
              id="notes"
              {...form.register("notes")}
              rows={3}
              maxLength={500}
              placeholder="Meeting point details, luggage info, etc."
              className="w-full resize-none rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <div className="mt-1 flex justify-between">
              {form.formState.errors.notes && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.notes.message}
                </p>
              )}
              <p className="ml-auto text-xs text-text-secondary">
                {(form.watch("notes") || "").length}/500
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Submit */}
      {submitError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-surface transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting && (
          <svg
            className="h-5 w-5 animate-spin"
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
        )}
        {isSubmitting ? "Posting ride..." : "Post Ride"}
      </button>
    </form>
  );
}

/**
 * Haversine distance in meters between two points.
 * Used as fallback when Edge Function is unavailable.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert encoded polyline to WKT LINESTRING for PostGIS insertion.
 * PostGIS auto-casts WKT text to geography type.
 */
function encodedPolylineToWKT(encoded: string): string {
  const points: [number, number][] = decodePolyline(encoded);
  const coords = points.map(([lat, lng]) => `${lng} ${lat}`).join(", ");
  return `LINESTRING(${coords})`;
}
