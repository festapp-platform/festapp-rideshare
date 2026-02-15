"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  CreateRouteIntentSchema,
  type CreateRouteIntent,
  PRICING,
  calculateSuggestedPrice,
} from "@festapp/shared";
import { decode as decodePolyline } from "@googlemaps/polyline-codec";
import { createClient } from "@/lib/supabase/client";
import { AddressInput, type PlaceResult } from "../../components/address-input";
import { RouteMap } from "../../components/route-map";

interface RouteInfo {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  suggestedPriceCzk: number;
}

export function RouteIntentForm() {
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

  const form = useForm<CreateRouteIntent>({
    resolver: zodResolver(CreateRouteIntentSchema),
    defaultValues: {
      seats_total: 4,
      booking_mode: "request",
      notes: "",
    },
  });

  const watchedSeats = form.watch("seats_total");
  const watchedBookingMode = form.watch("booking_mode");

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

    form.setValue("origin_address", origin.address);
    form.setValue("origin_lat", origin.lat);
    form.setValue("origin_lng", origin.lng);
    form.setValue("destination_address", destination.address);
    form.setValue("destination_lat", destination.lat);
    form.setValue("destination_lng", destination.lng);

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
        setRouteInfo(data as RouteInfo);
        form.setValue("price_czk", Math.round(data.suggestedPriceCzk / 10) * 10);
      } catch {
        // Fallback to haversine estimate
        if (origin && destination) {
          const R = 6371000;
          const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
          const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((origin.lat * Math.PI) / 180) *
              Math.cos((destination.lat * Math.PI) / 180) *
              Math.sin(dLng / 2) ** 2;
          const straight = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const estDistance = straight * 1.3;
          const pricing = calculateSuggestedPrice(estDistance);
          setRouteInfo({
            distanceMeters: estDistance,
            durationSeconds: 0,
            encodedPolyline: "",
            suggestedPriceCzk: pricing.suggested,
          });
          form.setValue("price_czk", Math.round(pricing.suggested / 10) * 10);
          setRouteError(null);
        } else {
          setRouteError("Failed to compute route");
        }
      } finally {
        setIsComputingRoute(false);
      }
    }

    computeRoute();
  }, [origin, destination, supabase, form]);

  async function onSubmit(values: CreateRouteIntent) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSubmitError("You must be logged in to post a route.");
        return;
      }

      const intentData: Record<string, unknown> = {
        driver_id: user.id,
        origin_location: `POINT(${values.origin_lng} ${values.origin_lat})`,
        origin_address: values.origin_address,
        destination_location: `POINT(${values.destination_lng} ${values.destination_lat})`,
        destination_address: values.destination_address,
        seats_total: values.seats_total,
        price_czk: values.price_czk ?? null,
        booking_mode: values.booking_mode,
        notes: values.notes ?? null,
        vehicle_id: values.vehicle_id ?? null,
      };

      // Add route geometry if available
      if (routeInfo?.encodedPolyline) {
        intentData.route_encoded_polyline = routeInfo.encodedPolyline;
        const points: [number, number][] = decodePolyline(routeInfo.encodedPolyline);
        const coords = points.map(([lat, lng]) => `${lng} ${lat}`).join(", ");
        intentData.route_geometry = `LINESTRING(${coords})`;
      }

      const { error } = await supabase.from("route_intents").insert(intentData);

      if (error) throw new Error(error.message || "Failed to create route intent");

      router.push("/routes");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create route intent",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto max-w-2xl space-y-6"
    >
      {/* Route section */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-main">
          Where do you travel?
        </h2>
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
          <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Computing route...
          </div>
        )}

        {routeError && <p className="mt-3 text-sm text-red-500">{routeError}</p>}

        {routeInfo && origin && destination && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                <span className="text-text-secondary">Distance: </span>
                <span className="font-medium text-text-main">
                  {(routeInfo.distanceMeters / 1000).toFixed(1)} km
                </span>
              </div>
              {routeInfo.suggestedPriceCzk > 0 && (
                <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                  <span className="text-text-secondary">Suggested: </span>
                  <span className="font-medium text-text-main">
                    {routeInfo.suggestedPriceCzk} {PRICING.CURRENCY_SYMBOL}
                  </span>
                </div>
              )}
            </div>
            {routeInfo.encodedPolyline && (
              <RouteMap
                encodedPolyline={routeInfo.encodedPolyline}
                originLat={origin.lat}
                originLng={origin.lng}
                destLat={destination.lat}
                destLng={destination.lng}
              />
            )}
          </div>
        )}
      </section>

      {/* Details section */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-main">Details</h2>

        {/* Seats */}
        <div className="mb-6">
          <span className="mb-2 block text-sm font-medium text-text-main">
            Available seats
          </span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => form.setValue("seats_total", n)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold transition-colors ${
                  watchedSeats === n
                    ? "bg-primary text-surface"
                    : "border border-border-pastel bg-background text-text-main hover:bg-primary/5"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Booking mode */}
        <div className="mb-6">
          <span className="mb-2 block text-sm font-medium text-text-main">
            Booking mode
          </span>
          <div className="flex gap-3">
            {[
              { value: "instant" as const, label: "Instant", desc: "Passengers book immediately" },
              { value: "request" as const, label: "Request", desc: "You approve each booking" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => form.setValue("booking_mode", opt.value)}
                className={`flex-1 rounded-xl border-2 p-4 text-left transition-colors ${
                  watchedBookingMode === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border-pastel hover:border-primary/30"
                }`}
              >
                <div className="font-semibold text-text-main">{opt.label}</div>
                <div className="text-xs text-text-secondary">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <label htmlFor="price" className="mb-1 block text-sm font-medium text-text-main">
            Price per seat (CZK, optional)
          </label>
          <input
            id="price"
            type="number"
            min={0}
            max={5000}
            step={10}
            {...form.register("price_czk", { valueAsNumber: true })}
            placeholder={routeInfo ? String(Math.round(routeInfo.suggestedPriceCzk / 10) * 10) : "0"}
            className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Vehicle */}
        {vehicles.length > 0 && (
          <div className="mb-6">
            <label htmlFor="vehicle" className="mb-1 block text-sm font-medium text-text-main">
              Vehicle (optional)
            </label>
            <select
              id="vehicle"
              {...form.register("vehicle_id")}
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
        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-text-main">
            Notes for passengers (optional)
          </label>
          <textarea
            id="notes"
            {...form.register("notes")}
            rows={3}
            maxLength={500}
            placeholder="Schedule flexibility, meeting points, luggage policy..."
            className="w-full resize-none rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-text-secondary">
            {(form.watch("notes") || "").length}/500
          </p>
        </div>
      </section>

      {/* Submit error */}
      {submitError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !origin || !destination}
        className="w-full rounded-xl bg-primary px-6 py-3 text-base font-semibold text-surface transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Posting route...
          </span>
        ) : (
          "Post Route"
        )}
      </button>
    </form>
  );
}
