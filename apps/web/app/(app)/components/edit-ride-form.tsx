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
  updateRide,
  deleteRide,
} from "@festapp/shared";
import { decode as decodePolyline } from "@googlemaps/polyline-codec";
import { createClient } from "@/lib/supabase/client";
import {
  AddressAutocomplete,
  type PlaceResult,
} from "./address-autocomplete";
import { RideMap } from "./ride-map";

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
  luggage_size: string;
  booking_mode: string;
  preferences: Record<string, unknown>;
  notes: string | null;
  status: string;
  vehicle_id: string | null;
  profiles: RideProfile | null;
  vehicles: RideVehicle | null;
}

interface EditRideFormProps {
  ride: RideData;
}

interface RouteInfo {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  suggestedPriceCzk: number;
  priceMinCzk: number;
  priceMaxCzk: number;
}

/**
 * Parse PostGIS point to lat/lng.
 */
function parsePoint(value: unknown): { lat: number; lng: number } | null {
  if (!value) return null;
  if (typeof value === "string") {
    const match = value.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
  }
  if (typeof value === "object" && value !== null && "coordinates" in value) {
    const coords = (value as { coordinates: number[] }).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lng: coords[0], lat: coords[1] };
    }
  }
  return null;
}

function encodedPolylineToWKT(encoded: string): string {
  const points: [number, number][] = decodePolyline(encoded);
  const coords = points.map(([lat, lng]) => `${lng} ${lat}`).join(", ");
  return `LINESTRING(${coords})`;
}

export function EditRideForm({ ride }: EditRideFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const originCoords = parsePoint(ride.origin_location);
  const destCoords = parsePoint(ride.destination_location);

  const [origin, setOrigin] = useState<PlaceResult | null>(
    originCoords
      ? { lat: originCoords.lat, lng: originCoords.lng, address: ride.origin_address, placeId: "" }
      : null,
  );
  const [destination, setDestination] = useState<PlaceResult | null>(
    destCoords
      ? { lat: destCoords.lat, lng: destCoords.lng, address: ride.destination_address, placeId: "" }
      : null,
  );
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(
    ride.route_encoded_polyline && ride.distance_meters && ride.duration_seconds
      ? {
          encodedPolyline: ride.route_encoded_polyline,
          distanceMeters: ride.distance_meters,
          durationSeconds: ride.duration_seconds,
          suggestedPriceCzk: ride.suggested_price_czk ?? 0,
          priceMinCzk: PRICING.MIN_PRICE_CZK,
          priceMaxCzk: 10000,
        }
      : null,
  );
  const [routeChanged, setRouteChanged] = useState(false);
  const [isComputingRoute, setIsComputingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [vehicles, setVehicles] = useState<
    { id: string; make: string; model: string }[]
  >([]);

  // Format departure time for datetime-local input
  const departureLocal = ride.departure_time
    ? new Date(ride.departure_time).toISOString().slice(0, 16)
    : "";

  const form = useForm<CreateRide>({
    resolver: zodResolver(CreateRideSchema),
    defaultValues: {
      origin: origin
        ? { lat: origin.lat, lng: origin.lng, address: origin.address }
        : undefined,
      destination: destination
        ? { lat: destination.lat, lng: destination.lng, address: destination.address }
        : undefined,
      departureTime: ride.departure_time,
      seatsTotal: ride.seats_total,
      priceCzk: ride.price_czk ?? undefined,
      luggageSize: (ride.luggage_size as CreateRide["luggageSize"]) ?? "medium",
      bookingMode: (ride.booking_mode as CreateRide["bookingMode"]) ?? "request",
      preferences: ride.preferences as CreateRide["preferences"],
      notes: ride.notes ?? "",
      vehicleId: ride.vehicle_id ?? undefined,
    },
  });

  // Fetch user vehicles
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

  // Recompute route when origin/destination changes
  useEffect(() => {
    if (!routeChanged || !origin || !destination) return;

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
        if (error) throw new Error(error.message || "Failed to compute route");
        setRouteInfo(data);
        form.setValue("priceCzk", data.suggestedPriceCzk);
      } catch (err) {
        setRouteError(
          err instanceof Error ? err.message : "Failed to compute route",
        );
      } finally {
        setIsComputingRoute(false);
      }
    }
    computeRoute();
  }, [origin, destination, routeChanged, supabase, form]);

  function handleOriginChange(place: PlaceResult) {
    setOrigin(place);
    setRouteChanged(true);
  }

  function handleDestinationChange(place: PlaceResult) {
    setDestination(place);
    setRouteChanged(true);
  }

  async function onSubmit(values: CreateRide) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const updateData: Record<string, unknown> = {
        departure_time: new Date(values.departureTime).toISOString(),
        seats_total: values.seatsTotal,
        price_czk: values.priceCzk ?? null,
        luggage_size: values.luggageSize,
        booking_mode: values.bookingMode,
        preferences: values.preferences ?? {},
        notes: values.notes ?? null,
        vehicle_id: values.vehicleId ?? null,
      };

      // If route changed, update location and route data
      if (routeChanged && origin && destination) {
        updateData.origin_location = `POINT(${origin.lng} ${origin.lat})`;
        updateData.origin_address = origin.address;
        updateData.destination_location = `POINT(${destination.lng} ${destination.lat})`;
        updateData.destination_address = destination.address;

        if (routeInfo) {
          updateData.distance_meters = routeInfo.distanceMeters;
          updateData.duration_seconds = routeInfo.durationSeconds;
          updateData.route_encoded_polyline = routeInfo.encodedPolyline;
          updateData.suggested_price_czk = routeInfo.suggestedPriceCzk;
          updateData.route_geometry = encodedPolylineToWKT(
            routeInfo.encodedPolyline,
          );
        }
      }

      const { error } = await updateRide(
        supabase,
        ride.id,
        updateData as Parameters<typeof updateRide>[2],
      );
      if (error) throw new Error(error.message || "Failed to update ride");
      router.push(`/rides/${ride.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to update ride",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setIsDeleting(true);
    try {
      const { error } = await deleteRide(supabase, ride.id);
      if (error) throw error;
      router.push("/my-rides");
    } catch {
      setDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
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

  const priceRange = routeInfo
    ? { min: routeInfo.priceMinCzk, max: routeInfo.priceMaxCzk }
    : { min: PRICING.MIN_PRICE_CZK, max: 10000 };

  return (
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Route Section */}
        <section className="rounded-2xl border border-border-pastel bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-main">Route</h2>
          <div className="space-y-3">
            <AddressAutocomplete
              label="From"
              placeholder="Pickup location"
              defaultValue={ride.origin_address}
              onPlaceSelect={handleOriginChange}
            />
            <AddressAutocomplete
              label="To"
              placeholder="Destination"
              defaultValue={ride.destination_address}
              onPlaceSelect={handleDestinationChange}
            />
          </div>

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
          <Controller
            name="priceCzk"
            control={form.control}
            render={({ field }) => (
              <div className="space-y-2">
                <input
                  type="range"
                  min={priceRange.min}
                  max={priceRange.max}
                  value={field.value ?? 0}
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
          {form.formState.errors.priceCzk && (
            <p className="mt-1 text-xs text-red-500">
              {form.formState.errors.priceCzk.message}
            </p>
          )}
        </section>

        {/* Details Section */}
        <section className="rounded-2xl border border-border-pastel bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-main">
            Details
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Departure time */}
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
                defaultValue={departureLocal}
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

            {/* Luggage */}
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
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Delete ride */}
      <div className="border-t border-border-pastel pt-6">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={`w-full rounded-xl px-6 py-3 font-semibold transition-colors ${
            deleteConfirm
              ? "bg-red-600 text-white hover:bg-red-700"
              : "border border-red-300 text-red-600 hover:bg-red-50"
          } disabled:opacity-50`}
        >
          {isDeleting
            ? "Deleting..."
            : deleteConfirm
              ? "Confirm Delete"
              : "Delete Ride"}
        </button>
      </div>
    </div>
  );
}
