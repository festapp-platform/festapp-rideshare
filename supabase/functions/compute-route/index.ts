/**
 * Compute Route Edge Function.
 *
 * Proxies Google Routes API to compute route distance, duration, and polyline.
 * Also calculates suggested price based on Czech fuel costs.
 * Keeps the Google API key server-side -- never exposed to clients.
 *
 * Flow:
 *   1. Verify caller identity via Authorization header (user-scoped client)
 *   2. Validate request body (originLat, originLng, destLat, destLng)
 *   3. Call Google Routes API for route computation
 *   4. Calculate price suggestion from distance
 *   5. Return distance, duration, polyline, and price info
 *
 * Returns:
 *   200 - Route computed with price suggestion
 *   400 - Invalid request body
 *   401 - Unauthorized (missing or invalid auth header)
 *   404 - No route found between given coordinates
 *   405 - Method not allowed (only POST and OPTIONS)
 *   500 - Server error (missing API key or Google API failure)
 */
import { createUserClient } from "../_shared/supabase-client.ts";

const ROUTES_API_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

// Czech fuel cost constants (configurable via env)
const FUEL_PRICE_CZK_PER_LITER = parseFloat(
  Deno.env.get("FUEL_PRICE_CZK") ?? "35",
);
const AVG_FUEL_CONSUMPTION_L_PER_100KM = parseFloat(
  Deno.env.get("FUEL_CONSUMPTION") ?? "7",
);
const COST_SHARING_FACTOR = 0.6;

// CORS headers for web clients
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Verify caller identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userClient = createUserClient(authHeader);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate request body
    const body = await req.json();
    const { originLat, originLng, destLat, destLng } = body;

    if (
      typeof originLat !== "number" ||
      typeof originLng !== "number" ||
      typeof destLat !== "number" ||
      typeof destLng !== "number"
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid request body. Required: originLat, originLng, destLat, destLng (all numbers)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate coordinate ranges
    if (
      originLat < -90 || originLat > 90 ||
      destLat < -90 || destLat > 90 ||
      originLng < -180 || originLng > 180 ||
      destLng < -180 || destLng > 180
    ) {
      return new Response(
        JSON.stringify({
          error: "Coordinates out of range. Lat: -90 to 90, Lng: -180 to 180",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check for Google Routes API key
    const googleApiKey = Deno.env.get("GOOGLE_ROUTES_API_KEY");
    if (!googleApiKey) {
      console.error("GOOGLE_ROUTES_API_KEY is not set");
      return new Response(
        JSON.stringify({
          error: "Route computation is not configured. Contact support.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Call Google Routes API
    const routesResponse = await fetch(ROUTES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: { latitude: originLat, longitude: originLng },
          },
        },
        destination: {
          location: {
            latLng: { latitude: destLat, longitude: destLng },
          },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    const data = await routesResponse.json();

    if (!routesResponse.ok) {
      console.error("Google Routes API error:", JSON.stringify(data));
      return new Response(
        JSON.stringify({
          error: "Route computation failed",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const route = data.routes?.[0];

    if (!route) {
      return new Response(
        JSON.stringify({ error: "No route found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Extract route data
    const distanceMeters: number = route.distanceMeters;
    const distanceKm = distanceMeters / 1000;
    const durationSeconds: number = parseInt(
      route.duration.replace("s", ""),
      10,
    );
    const encodedPolyline: string = route.polyline.encodedPolyline;

    // Price suggestion: (distance_km / 100) * consumption * fuel_price * sharing_factor
    const fuelCost =
      (distanceKm / 100) *
      AVG_FUEL_CONSUMPTION_L_PER_100KM *
      FUEL_PRICE_CZK_PER_LITER;
    const suggestedPriceCzk = Math.round(fuelCost * COST_SHARING_FACTOR);
    const priceMinCzk = Math.max(20, Math.round(suggestedPriceCzk * 0.5));
    const priceMaxCzk = Math.round(suggestedPriceCzk * 2.0);

    return new Response(
      JSON.stringify({
        distanceMeters,
        durationSeconds,
        encodedPolyline,
        suggestedPriceCzk,
        priceMinCzk,
        priceMaxCzk,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Unexpected error in compute-route:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
