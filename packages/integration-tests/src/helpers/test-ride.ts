import { createAdminClient } from "./supabase-client.js";
import { registry } from "./cleanup.js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./config.js";

// Real Czech Republic coordinates for PostGIS testing
export const COORDS = {
  PRAGUE: { lat: 50.0755, lng: 14.4378 },
  BRNO: { lat: 49.1951, lng: 16.6068 },
  PLZEN: { lat: 49.7384, lng: 13.3736 },
  JIHLAVA: { lat: 49.3961, lng: 15.5912 },
  KARLOVY_VARY: { lat: 50.2325, lng: 12.8714 },
} as const;

export interface CreateRideOptions {
  driverId: string;
  vehicleId?: string;
  originLat?: number;
  originLng?: number;
  originAddress?: string;
  destLat?: number;
  destLng?: number;
  destAddress?: string;
  departureTime?: string;
  seatsTotal?: number;
  seatsAvailable?: number;
  priceCzk?: number;
  bookingMode?: "instant" | "request";
  status?: "upcoming" | "in_progress" | "completed" | "cancelled";
  routeGeometry?: string; // WKT LINESTRING
}

/**
 * Create a ride with PostGIS geography columns via raw SQL.
 * The _test_create_ride RPC only exists on local dev, so for production
 * tests we execute raw SQL through the Supabase REST API.
 */
export async function createTestRide(opts: CreateRideOptions): Promise<string> {
  const admin = createAdminClient();

  // First try the RPC (available on local dev)
  const { data: rpcData, error: rpcError } = await admin.rpc("_test_create_ride", {
    p_driver_id: opts.driverId,
    p_vehicle_id: opts.vehicleId ?? null,
    p_origin_lat: opts.originLat ?? COORDS.PRAGUE.lat,
    p_origin_lng: opts.originLng ?? COORDS.PRAGUE.lng,
    p_origin_address: opts.originAddress ?? "Prague Old Town",
    p_dest_lat: opts.destLat ?? COORDS.BRNO.lat,
    p_dest_lng: opts.destLng ?? COORDS.BRNO.lng,
    p_dest_address: opts.destAddress ?? "Brno Center",
    p_departure_time: opts.departureTime ?? new Date(Date.now() + 86400000).toISOString(),
    p_seats_total: opts.seatsTotal ?? 4,
    p_seats_available: opts.seatsAvailable ?? (opts.seatsTotal ?? 4),
    p_price_czk: opts.priceCzk ?? 250,
    p_booking_mode: opts.bookingMode ?? "instant",
    p_status: opts.status ?? "upcoming",
    p_route_geometry: opts.routeGeometry ?? null,
  });

  if (!rpcError) {
    const rideId = rpcData as string;
    registry.registerRide(rideId);
    return rideId;
  }

  // Fallback: insert via PostgREST using EWKT format for geography columns
  const originLng = opts.originLng ?? COORDS.PRAGUE.lng;
  const originLat = opts.originLat ?? COORDS.PRAGUE.lat;
  const destLng = opts.destLng ?? COORDS.BRNO.lng;
  const destLat = opts.destLat ?? COORDS.BRNO.lat;
  const seatsTotal = opts.seatsTotal ?? 4;

  const insertData: Record<string, unknown> = {
    driver_id: opts.driverId,
    vehicle_id: opts.vehicleId ?? null,
    origin_location: `SRID=4326;POINT(${originLng} ${originLat})`,
    origin_address: opts.originAddress ?? "Prague Old Town",
    destination_location: `SRID=4326;POINT(${destLng} ${destLat})`,
    destination_address: opts.destAddress ?? "Brno Center",
    departure_time: opts.departureTime ?? new Date(Date.now() + 86400000).toISOString(),
    seats_total: seatsTotal,
    seats_available: opts.seatsAvailable ?? seatsTotal,
    price_czk: opts.priceCzk ?? 250,
    booking_mode: opts.bookingMode ?? "instant",
    status: opts.status ?? "upcoming",
  };

  if (opts.routeGeometry) {
    insertData.route_geometry = `SRID=4326;${opts.routeGeometry}`;
  }

  const { data, error } = await admin
    .from("rides")
    .insert(insertData)
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create test ride: ${error.message}`);
  registry.registerRide(data.id as string);
  return data.id as string;
}
