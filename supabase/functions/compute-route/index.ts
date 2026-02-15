/**
 * Compute Route Edge Function.
 *
 * Supports two routing providers:
 *   - Mapy.cz (preferred for Czech/Slovak rides, set MAPY_CZ_API_KEY)
 *   - Google Routes API (fallback, set GOOGLE_ROUTES_API_KEY)
 *
 * Provider selection: Uses MAPY_CZ_API_KEY if set, otherwise GOOGLE_ROUTES_API_KEY.
 * Override with ROUTE_PROVIDER=google|mapy env var.
 *
 * Returns:
 *   200 - Route computed with price suggestion
 *   400 - Invalid request body
 *   401 - Unauthorized
 *   404 - No route found
 *   500 - Server error
 */
import { createUserClient } from "../_shared/supabase-client.ts";

// Czech fuel cost constants (configurable via env)
const FUEL_PRICE_CZK_PER_LITER = parseFloat(
  Deno.env.get("FUEL_PRICE_CZK") ?? "35",
);
const AVG_FUEL_CONSUMPTION_L_PER_100KM = parseFloat(
  Deno.env.get("FUEL_CONSUMPTION") ?? "7",
);
const COST_SHARING_FACTOR = 0.6;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function calculatePrice(distanceMeters: number) {
  const distanceKm = distanceMeters / 1000;
  const fuelCost =
    (distanceKm / 100) *
    AVG_FUEL_CONSUMPTION_L_PER_100KM *
    FUEL_PRICE_CZK_PER_LITER;
  const suggestedPriceCzk = Math.max(20, Math.round(fuelCost * COST_SHARING_FACTOR));
  const priceMinCzk = Math.max(20, Math.round(suggestedPriceCzk * 0.5));
  const priceMaxCzk = Math.round(suggestedPriceCzk * 2.0);
  return { suggestedPriceCzk, priceMinCzk, priceMaxCzk };
}

// ─── Mapy.cz routing ───

async function computeRouteMapyCz(
  apiKey: string,
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
) {
  const url = new URL("https://api.mapy.cz/v1/routing/route");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("start", `${originLng},${originLat}`);
  url.searchParams.set("end", `${destLng},${destLat}`);
  url.searchParams.set("routeType", "car_fast_traffic");
  url.searchParams.set("format", "polyline");
  url.searchParams.set("lang", "cs");

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok) {
    console.error("Mapy.cz routing error:", JSON.stringify(data));
    return null;
  }

  const distanceMeters: number = data.length;
  const durationSeconds: number = data.duration;
  // Mapy.cz with format=polyline returns geometry as encoded polyline string
  const encodedPolyline: string = data.geometry ?? "";

  return { distanceMeters, durationSeconds, encodedPolyline };
}

// ─── Google Routes API routing ───

async function computeRouteGoogle(
  apiKey: string,
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
) {
  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
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
    },
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("Google Routes API error:", JSON.stringify(data));
    return null;
  }

  const route = data.routes?.[0];
  if (!route) return null;

  const distanceMeters: number = route.distanceMeters;
  const durationSeconds: number = parseInt(
    route.duration.replace("s", ""),
    10,
  );
  const encodedPolyline: string = route.polyline.encodedPolyline;

  return { distanceMeters, durationSeconds, encodedPolyline };
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Verify caller identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const userClient = createUserClient(authHeader);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
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
      return jsonResponse(
        {
          error:
            "Invalid request body. Required: originLat, originLng, destLat, destLng (all numbers)",
        },
        400,
      );
    }

    if (
      originLat < -90 || originLat > 90 ||
      destLat < -90 || destLat > 90 ||
      originLng < -180 || originLng > 180 ||
      destLng < -180 || destLng > 180
    ) {
      return jsonResponse(
        { error: "Coordinates out of range. Lat: -90 to 90, Lng: -180 to 180" },
        400,
      );
    }

    // Determine provider
    const mapyCzKey = Deno.env.get("MAPY_CZ_API_KEY");
    const googleKey = Deno.env.get("GOOGLE_ROUTES_API_KEY");
    const providerOverride = Deno.env.get("ROUTE_PROVIDER"); // "google" | "mapy"

    let routeResult: {
      distanceMeters: number;
      durationSeconds: number;
      encodedPolyline: string;
    } | null = null;
    let provider = "none";

    if (providerOverride === "google" && googleKey) {
      routeResult = await computeRouteGoogle(
        googleKey, originLat, originLng, destLat, destLng,
      );
      provider = "google";
    } else if (providerOverride === "mapy" && mapyCzKey) {
      routeResult = await computeRouteMapyCz(
        mapyCzKey, originLat, originLng, destLat, destLng,
      );
      provider = "mapy";
    } else if (mapyCzKey) {
      // Default: prefer Mapy.cz
      routeResult = await computeRouteMapyCz(
        mapyCzKey, originLat, originLng, destLat, destLng,
      );
      provider = "mapy";
      // Fallback to Google if Mapy.cz fails
      if (!routeResult && googleKey) {
        routeResult = await computeRouteGoogle(
          googleKey, originLat, originLng, destLat, destLng,
        );
        provider = "google";
      }
    } else if (googleKey) {
      routeResult = await computeRouteGoogle(
        googleKey, originLat, originLng, destLat, destLng,
      );
      provider = "google";
    } else {
      return jsonResponse(
        { error: "Route computation is not configured. Set MAPY_CZ_API_KEY or GOOGLE_ROUTES_API_KEY." },
        500,
      );
    }

    if (!routeResult) {
      return jsonResponse({ error: "No route found" }, 404);
    }

    const pricing = calculatePrice(routeResult.distanceMeters);

    return jsonResponse(
      {
        ...routeResult,
        ...pricing,
        provider,
      },
      200,
    );
  } catch (error) {
    console.error("Unexpected error in compute-route:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
