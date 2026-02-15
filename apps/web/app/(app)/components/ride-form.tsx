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
import { AddressInput, type PlaceResult } from "./address-input";
import { RouteMap } from "./route-map";

interface RouteInfo {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  suggestedPriceCzk: number;
  priceMinCzk: number;
  priceMaxCzk: number;
}

type WizardStep = 0 | 1 | 2;
const STEP_LABELS = ["Route", "When", "Price"] as const;

export function RideForm() {
  const router = useRouter();
  const supabase = createClient();

  // Wizard step
  const [currentStep, setCurrentStep] = useState<WizardStep>(0);

  // Route state
  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isComputingRoute, setIsComputingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Vehicles
  const [vehicles, setVehicles] = useState<
    { id: string; make: string; model: string }[]
  >([]);

  // Departure time decomposition
  const [selectedDate, setSelectedDate] = useState<
    "today" | "tomorrow" | "custom"
  >("today");
  const [customDate, setCustomDate] = useState("");
  const [selectedHour, setSelectedHour] = useState("08");
  const [selectedMinute, setSelectedMinute] = useState("00");

  const form = useForm<CreateRide>({
    resolver: zodResolver(CreateRideSchema),
    defaultValues: {
      seatsTotal: 4,
      bookingMode: "request",
      notes: "",
    },
  });

  // Compose departure time from date/time parts
  useEffect(() => {
    const now = new Date();
    let dateStr: string;

    if (selectedDate === "today") {
      dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    } else if (selectedDate === "tomorrow") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    } else {
      dateStr = customDate;
    }

    if (dateStr) {
      const isoString = `${dateStr}T${selectedHour}:${selectedMinute}:00.000Z`;
      form.setValue("departureTime", isoString);
    }
  }, [selectedDate, customDate, selectedHour, selectedMinute, form]);

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
        form.setValue("priceCzk", Math.round(route.suggestedPriceCzk / 10) * 10);
      } catch {
        // Fallback to client-side haversine estimate
        if (origin && destination) {
          const straight = haversineDistance(
            origin.lat,
            origin.lng,
            destination.lat,
            destination.lng,
          );
          const estDistance = straight * 1.3;
          const pricing = calculateSuggestedPrice(estDistance);
          setRouteInfo({
            distanceMeters: estDistance,
            durationSeconds: 0,
            encodedPolyline: "",
            suggestedPriceCzk: pricing.suggested,
            priceMinCzk: pricing.min,
            priceMaxCzk: pricing.max,
          });
          form.setValue("priceCzk", Math.round(pricing.suggested / 10) * 10);
          // Clear error — fallback succeeded
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

  // Price range based on distance
  // Round to nearest 10 for cash-friendly slider values
  const roundTo10 = (n: number) => Math.round(n / 10) * 10;
  const priceRange = routeInfo
    ? {
        min: Math.max(
          PRICING.MIN_PRICE_CZK,
          roundTo10(routeInfo.suggestedPriceCzk * PRICING.MIN_PRICE_FACTOR),
        ),
        max: roundTo10(
          routeInfo.suggestedPriceCzk * PRICING.MAX_PRICE_FACTOR,
        ),
      }
    : { min: PRICING.MIN_PRICE_CZK, max: 200 };

  // Step navigation
  function goNext() {
    if (currentStep === 0) {
      if (!routeInfo) {
        setRouteError("Please select both pickup and destination.");
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, 2) as WizardStep);
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 0) as WizardStep);
  }

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
        distance_meters: routeInfo?.distanceMeters
          ? Math.round(routeInfo.distanceMeters)
          : null,
        duration_seconds: routeInfo?.durationSeconds ?? null,
        route_encoded_polyline: routeInfo?.encodedPolyline || null,
        booking_mode: values.bookingMode,
        preferences: values.preferences ?? {},
        notes: values.notes ?? null,
        vehicle_id: values.vehicleId ?? null,
        ...(routeInfo?.encodedPolyline
          ? {
              route_geometry: encodedPolylineToWKT(routeInfo.encodedPolyline),
            }
          : {}),
      };

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

  const watchedSeats = form.watch("seatsTotal");
  const watchedBookingMode = form.watch("bookingMode");

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto max-w-2xl space-y-6"
    >
      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} labels={STEP_LABELS} />

      {/* Step 0: Route */}
      {currentStep === 0 && (
        <section className="rounded-2xl border border-border-pastel bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-main">
            Where are you going?
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
                {routeInfo.durationSeconds > 0 && (
                  <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                    <span className="text-text-secondary">Duration: </span>
                    <span className="font-medium text-text-main">
                      {formatDuration(routeInfo.durationSeconds)}
                    </span>
                  </div>
                )}
                <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                  <span className="text-text-secondary">Suggested: </span>
                  <span className="font-medium text-text-main">
                    {routeInfo.suggestedPriceCzk} {PRICING.CURRENCY_SYMBOL}
                  </span>
                </div>
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
      )}

      {/* Step 1: When & Details */}
      {currentStep === 1 && (
        <section className="rounded-2xl border border-border-pastel bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-main">
            When are you leaving?
          </h2>

          {/* Date quick-pick */}
          <div className="mb-6">
            <span className="mb-2 block text-sm font-medium text-text-main">
              Date
            </span>
            <div className="flex gap-3">
              {(["today", "tomorrow"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedDate(opt)}
                  className={`flex-1 rounded-xl px-4 py-3 text-base font-semibold capitalize transition-colors ${
                    selectedDate === opt
                      ? "bg-primary text-surface"
                      : "border border-border-pastel bg-background text-text-main hover:bg-primary/5"
                  }`}
                >
                  {opt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedDate("custom")}
                className={`flex-1 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                  selectedDate === "custom"
                    ? "bg-primary text-surface"
                    : "border border-border-pastel bg-background text-text-main hover:bg-primary/5"
                }`}
              >
                Pick date
              </button>
            </div>
            {selectedDate === "custom" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="mt-3 w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            )}
          </div>

          {/* Time picker */}
          <div className="mb-6">
            <span className="mb-2 block text-sm font-medium text-text-main">
              Time
            </span>
            <div className="flex items-center gap-2">
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(e.target.value)}
                className="flex-1 rounded-xl border border-border-pastel bg-background px-4 py-3 text-center text-lg font-semibold text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, i) =>
                  String(i).padStart(2, "0"),
                ).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-2xl font-bold text-text-secondary">:</span>
              <select
                value={selectedMinute}
                onChange={(e) => setSelectedMinute(e.target.value)}
                className="flex-1 rounded-xl border border-border-pastel bg-background px-4 py-3 text-center text-lg font-semibold text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {["00", "15", "30", "45"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                  onClick={() => form.setValue("seatsTotal", n)}
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
            {form.formState.errors.seatsTotal && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.seatsTotal.message}
              </p>
            )}
          </div>

          {/* Booking mode */}
          <div>
            <span className="mb-2 block text-sm font-medium text-text-main">
              Booking mode
            </span>
            <div className="flex gap-3">
              {[
                {
                  value: "instant" as const,
                  label: "Instant",
                  desc: "Passengers book immediately",
                },
                {
                  value: "request" as const,
                  label: "Request",
                  desc: "You approve each booking",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => form.setValue("bookingMode", opt.value)}
                  className={`flex-1 rounded-xl border-2 p-4 text-left transition-colors ${
                    watchedBookingMode === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border-pastel hover:border-primary/30"
                  }`}
                >
                  <div className="font-semibold text-text-main">
                    {opt.label}
                  </div>
                  <div className="text-xs text-text-secondary">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Step 2: Price & Notes */}
      {currentStep === 2 && (
        <section className="rounded-2xl border border-border-pastel bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-main">
            Price & details
          </h2>

          {/* Route summary reminder */}
          {routeInfo && (
            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                {formatDistance(routeInfo.distanceMeters)}
              </div>
              {routeInfo.durationSeconds > 0 && (
                <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                  {formatDuration(routeInfo.durationSeconds)}
                </div>
              )}
            </div>
          )}

          {/* Price slider */}
          <div className="mb-6">
            <label
              htmlFor="price"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              Price ({PRICING.CURRENCY_SYMBOL})
            </label>
            {routeInfo && (
              <p className="mb-2 text-xs text-text-secondary">
                Recommended: {routeInfo.suggestedPriceCzk}{" "}
                {PRICING.CURRENCY_SYMBOL} (based on fuel costs)
              </p>
            )}
            <Controller
              name="priceCzk"
              control={form.control}
              render={({ field }) => (
                <div className="space-y-2">
                  <input
                    id="price"
                    type="range"
                    step={10}
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
            {form.formState.errors.priceCzk && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.priceCzk.message}
              </p>
            )}
          </div>

          {/* Vehicle selection */}
          {vehicles.length > 0 && (
            <div className="mb-6">
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
          <div>
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
              placeholder="Meeting point, luggage info, pets, smoking policy..."
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
        </section>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="flex-1 rounded-xl border border-border-pastel px-4 py-3 text-base font-semibold text-text-main transition-colors hover:bg-primary/5"
          >
            Back
          </button>
        )}
        {currentStep < 2 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={currentStep === 0 && (!routeInfo || isComputingRoute)}
            className="flex-1 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-surface transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-surface transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
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
                Posting ride...
              </span>
            ) : (
              "Post Ride"
            )}
          </button>
        )}
      </div>
    </form>
  );
}

/* ─── Helper components ─── */

function StepIndicator({
  currentStep,
  labels,
}: {
  currentStep: number;
  labels: readonly string[];
}) {
  return (
    <div className="flex items-center justify-center gap-1 px-2">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className="flex items-center gap-1.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                i < currentStep
                  ? "bg-primary/20 text-primary"
                  : i === currentStep
                    ? "bg-primary text-surface"
                    : "bg-border-pastel text-text-secondary"
              }`}
            >
              {i < currentStep ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                i === currentStep ? "text-text-main" : "text-text-secondary"
              }`}
            >
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div
              className={`mx-1 h-0.5 w-8 rounded transition-colors ${
                i < currentStep ? "bg-primary" : "bg-border-pastel"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Utility functions ─── */

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

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
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

function encodedPolylineToWKT(encoded: string): string {
  const points: [number, number][] = decodePolyline(encoded);
  const coords = points.map(([lat, lng]) => `${lng} ${lat}`).join(", ");
  return `LINESTRING(${coords})`;
}
