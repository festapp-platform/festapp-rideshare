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
  getApprovedEvents,
  formatPrice,
} from "@festapp/shared";
import { createRide } from "@festapp/shared";
import { decode as decodePolyline } from "@googlemaps/polyline-codec";
import { createClient } from "@/lib/supabase/client";
import { AddressInput, type PlaceResult } from "./address-input";
import { RouteMap } from "./route-map";
import { DateTimePicker } from "./date-time-picker";
import { useI18n } from "@/lib/i18n/provider";
import { sendAiMessage } from "../assistant/actions";
import { MapLocationPicker } from "./map-location-picker";

const MAPY_API_KEY = process.env.NEXT_PUBLIC_MAPY_CZ_API_KEY ?? "";

async function forwardGeocode(address: string): Promise<PlaceResult | null> {
  if (!MAPY_API_KEY || !address.trim()) return null;

  try {
    const url = new URL("https://api.mapy.cz/v1/geocode");
    url.searchParams.set("apikey", MAPY_API_KEY);
    url.searchParams.set("query", address);
    url.searchParams.set("lang", "cs");
    url.searchParams.set("limit", "1");
    url.searchParams.set("type", "regional");
    url.searchParams.set("locality", "cz,sk");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const item = data?.items?.[0];
    if (!item?.position) return null;

    return {
      lat: item.position.lat,
      lng: item.position.lon, // Mapy.cz uses "lon" -- map to "lng" for PlaceResult
      address: item.name || address,
      placeId: `mapy-${item.position.lat}-${item.position.lon}`,
    };
  } catch {
    return null;
  }
}

interface RouteInfo {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  suggestedPriceCzk: number;
  priceMinCzk: number;
  priceMaxCzk: number;
}

interface LinkedEvent {
  id: string;
  name: string;
  location_address: string;
  location_lat: number;
  location_lng: number;
}

interface RideFormProps {
  linkedEvent?: LinkedEvent | null;
}

type WizardStep = 0 | 1 | 2;

export function RideForm({ linkedEvent }: RideFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useI18n();

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

  // AI prompt state (GROUP-E2)
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("ai_suggestions_enabled") !== "false";
  });

  // Waypoint state (ROUTE-01)
  interface WaypointInput {
    address: string;
    lat: number;
    lng: number;
  }
  const [waypoints, setWaypoints] = useState<WaypointInput[]>([]);
  const MAX_WAYPOINTS = 5;

  // Map picker state (GROUP-F1)
  const [showMapPicker, setShowMapPicker] = useState<"origin" | "destination" | null>(null);

  // Event linking
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    linkedEvent?.id ?? null,
  );
  const [availableEvents, setAvailableEvents] = useState<
    { id: string; name: string }[]
  >([]);

  // Vehicles
  const [vehicles, setVehicles] = useState<
    { id: string; make: string; model: string }[]
  >([]);

  // Departure time decomposition
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [selectedHour, setSelectedHour] = useState("08");
  const [selectedMinute, setSelectedMinute] = useState("00");

  const form = useForm<CreateRide>({
    resolver: zodResolver(CreateRideSchema),
    shouldUnregister: false,
    defaultValues: {
      seatsTotal: 4,
      bookingMode: "request",
      notes: "",
    },
  });

  // Compose departure time from date/time parts
  useEffect(() => {
    if (selectedDate) {
      const isoString = `${selectedDate}T${selectedHour}:${selectedMinute}:00.000Z`;
      form.setValue("departureTime", isoString);
    }
  }, [selectedDate, selectedHour, selectedMinute, form]);

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

  // Pre-fill destination from linked event
  useEffect(() => {
    if (linkedEvent && linkedEvent.location_lat !== 0) {
      const eventPlace: PlaceResult = {
        lat: linkedEvent.location_lat,
        lng: linkedEvent.location_lng,
        address: linkedEvent.location_address,
        placeId: "",
      };
      setDestination(eventPlace);
    }
  }, [linkedEvent]);

  // Fetch approved events for optional linking dropdown
  useEffect(() => {
    async function fetchEvents() {
      const { data } = await getApprovedEvents(supabase);
      if (data) {
        setAvailableEvents(data.map((e) => ({ id: e.id, name: e.name })));
      }
    }
    fetchEvents();
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
        setRouteError(t("rideForm.selectBothPoints"));
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, 2) as WizardStep);
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 0) as WizardStep);
  }

  // AI prompt handler (GROUP-E2)
  async function handleAiPrompt() {
    if (!aiPrompt.trim() || isAiParsing) return;
    setIsAiParsing(true);
    try {
      const result = await sendAiMessage(aiPrompt, []);
      if (result.intent?.params) {
        const params = result.intent.params;

        // Geocode origin and destination addresses in parallel
        const [originPlace, destPlace] = await Promise.all([
          params.origin_address
            ? forwardGeocode(params.origin_address as string)
            : Promise.resolve(null),
          params.destination_address
            ? forwardGeocode(params.destination_address as string)
            : Promise.resolve(null),
        ]);

        if (originPlace) {
          setOrigin(originPlace);
        }
        if (destPlace) {
          setDestination(destPlace);
        }

        // Fill departure time from AI parsed params
        if (params.departure_date) {
          setSelectedDate(params.departure_date as string);
        }
        if (params.departure_time) {
          const timeParts = (params.departure_time as string).split(":");
          if (timeParts[0]) setSelectedHour(timeParts[0].padStart(2, "0"));
          if (timeParts[1]) setSelectedMinute(timeParts[1].padStart(2, "0"));
        }
        if (params.available_seats) {
          form.setValue("seatsTotal", params.available_seats as number);
        }
        if (params.price_per_seat) {
          form.setValue("priceCzk", params.price_per_seat as number);
        }
        if (params.notes) {
          form.setValue("notes", params.notes as string);
        }
      }
    } catch {
      // AI failed silently -- user can still fill form manually
    } finally {
      setIsAiParsing(false);
    }
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
        event_id: selectedEventId ?? null,
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

      // Insert waypoints sequentially (ROUTE-01)
      if (ride?.id && waypoints.length > 0) {
        for (let i = 0; i < waypoints.length; i++) {
          try {
            await supabase.from("ride_waypoints").insert({
              ride_id: ride.id,
              location: `POINT(${waypoints[i].lng} ${waypoints[i].lat})`,
              address: waypoints[i].address,
              order_index: i,
              type: "pickup",
            });
          } catch (err) {
            console.warn(`Failed to insert waypoint ${i}:`, err);
          }
        }
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

  // Handle map location selection (GROUP-F1)
  function handleMapConfirm(lat: number, lng: number, address: string) {
    const place: PlaceResult = { lat, lng, address, placeId: "" };
    if (showMapPicker === "origin") {
      setOrigin(place);
    } else if (showMapPicker === "destination") {
      setDestination(place);
    }
    setShowMapPicker(null);
  }

  const watchedSeats = form.watch("seatsTotal");
  const watchedBookingMode = form.watch("bookingMode");

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto max-w-2xl space-y-6"
    >
      {/* AI prompt field (GROUP-E2) */}
      {aiEnabled && currentStep === 0 && (
        <div className="rounded-2xl border border-border-pastel bg-surface p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAiPrompt();
                }
              }}
              placeholder={t("rideForm.aiPromptPlaceholder")}
              className="flex-1 rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAiPrompt}
              disabled={isAiParsing || !aiPrompt.trim()}
              className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              {isAiParsing ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} labels={[t("rideForm.route"), t("rideForm.when"), t("rides.price")]} />

      {/* Step 0: Route */}
      {currentStep === 0 && (
        <section className="rounded-2xl border border-border-pastel bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-main">
            {t("rideForm.whereGoing")}
          </h2>
          <div className="space-y-3">
            <AddressInput
              label={t("rideForm.from")}
              placeholder={t("rideForm.pickupLocation")}
              onPlaceSelect={setOrigin}
            />
            <button
              type="button"
              onClick={() => setShowMapPicker("origin")}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t("rideForm.chooseOnMap")}
            </button>
            <AddressInput
              label={t("rideForm.to")}
              placeholder={t("rideForm.destination")}
              onPlaceSelect={setDestination}
            />
            <button
              type="button"
              onClick={() => setShowMapPicker("destination")}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t("rideForm.chooseOnMap")}
            </button>
          </div>

          {/* Waypoints (ROUTE-01) */}
          <div className="mt-4 space-y-2">
            <span className="block text-sm font-medium text-text-main">
              {t("rideForm.waypoints")}
            </span>
            {waypoints.map((wp, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <svg className="h-4 w-4 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1">
                  <AddressInput
                    label=""
                    placeholder={t("rideForm.waypointPlaceholder")}
                    onPlaceSelect={(place) => {
                      setWaypoints((prev) => {
                        const updated = [...prev];
                        updated[idx] = {
                          address: place.address,
                          lat: place.lat,
                          lng: place.lng,
                        };
                        return updated;
                      });
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setWaypoints((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="flex-shrink-0 rounded-lg p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-500 transition-colors"
                  title={t("rideForm.removeWaypoint")}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {waypoints.length < MAX_WAYPOINTS ? (
              <button
                type="button"
                onClick={() =>
                  setWaypoints((prev) => [
                    ...prev,
                    { address: "", lat: 0, lng: 0 },
                  ])
                }
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {t("rideForm.addWaypoint")}
              </button>
            ) : (
              <p className="text-xs text-text-secondary">
                {t("rideForm.maxWaypoints")}
              </p>
            )}
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
              {t("rideForm.computingRoute")}
            </div>
          )}

          {routeError && (
            <p className="mt-3 text-sm text-red-500">{routeError}</p>
          )}

          {routeInfo && origin && destination && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                  <span className="text-text-secondary">{t("rideForm.distance")}: </span>
                  <span className="font-medium text-text-main">
                    {formatDistance(routeInfo.distanceMeters)}
                  </span>
                </div>
                {routeInfo.durationSeconds > 0 && (
                  <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                    <span className="text-text-secondary">{t("rideForm.duration")}: </span>
                    <span className="font-medium text-text-main">
                      {formatDuration(routeInfo.durationSeconds)}
                    </span>
                  </div>
                )}
                <div className="rounded-lg bg-primary/5 px-3 py-1.5">
                  <span className="text-text-secondary">{t("rideForm.suggested")}: </span>
                  <span className="font-medium text-text-main">
                    {formatPrice(routeInfo.suggestedPriceCzk)}
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
            {t("rideForm.whenLeaving")}
          </h2>

          {/* Date & Time picker */}
          <div className="mb-6">
            <DateTimePicker
              selectedDate={selectedDate}
              selectedHour={selectedHour}
              selectedMinute={selectedMinute}
              onDateChange={setSelectedDate}
              onHourChange={setSelectedHour}
              onMinuteChange={setSelectedMinute}
              dateLabel={t("rides.date")}
              timeLabel={t("rideForm.time")}
            />
          </div>

          {/* Seats */}
          <div className="mb-6">
            <span className="mb-2 block text-sm font-medium text-text-main">
              {t("rideForm.availableSeats")}
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
              {t("rideForm.bookingMode")}
            </span>
            <div className="flex gap-3">
              {[
                {
                  value: "instant" as const,
                  label: t("rideForm.instant"),
                  desc: t("rideForm.instantDesc"),
                },
                {
                  value: "request" as const,
                  label: t("rideForm.request"),
                  desc: t("rideForm.requestDesc"),
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
            {t("rideForm.priceDetails")}
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
              {t("rides.price")}
            </label>
            {routeInfo && (
              <p className="mb-2 text-xs text-text-secondary">
                {t("rideForm.suggested")}: {formatPrice(routeInfo.suggestedPriceCzk)}
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
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>{formatPrice(priceRange.min)}</span>
                    <span>{formatPrice(priceRange.max)}</span>
                  </div>
                  <p className="text-center text-2xl font-bold text-primary">
                    {formatPrice(field.value ?? 0)}
                  </p>
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
                {t("rideForm.vehicleOptional")}
              </label>
              <select
                id="vehicle"
                {...form.register("vehicleId")}
                className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">{t("rideForm.selectVehicle")}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Event linking */}
          {availableEvents.length > 0 && (
            <div className="mb-6">
              <label
                htmlFor="event"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                {t("rideForm.linkEvent")}
              </label>
              <select
                id="event"
                value={selectedEventId ?? ""}
                onChange={(e) =>
                  setSelectedEventId(e.target.value || null)
                }
                className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">{t("rideForm.noEvent")}</option>
                {availableEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
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
              {t("rideForm.notesLabel")}
            </label>
            <textarea
              id="notes"
              {...form.register("notes")}
              rows={3}
              maxLength={500}
              placeholder={t("rideForm.notesPlaceholder")}
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
            {t("common.back")}
          </button>
        )}
        {currentStep < 2 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={currentStep === 0 && (!routeInfo || isComputingRoute)}
            className="flex-1 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-surface transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {t("rideForm.next")}
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
                {t("rideForm.postingRide")}
              </span>
            ) : (
              t("rides.postRide")
            )}
          </button>
        )}
      </div>

      {/* Map location picker overlay (GROUP-F1) */}
      {showMapPicker && (
        <MapLocationPicker
          onConfirm={handleMapConfirm}
          onCancel={() => setShowMapPicker(null)}
          initialLat={showMapPicker === "origin" ? origin?.lat : destination?.lat}
          initialLng={showMapPicker === "origin" ? origin?.lng : destination?.lng}
        />
      )}
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
