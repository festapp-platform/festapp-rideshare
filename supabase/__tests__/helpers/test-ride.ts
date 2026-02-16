import { createAdminClient } from "./supabase-client";

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

/** Create a ride with PostGIS geography columns via test helper RPC. */
export async function createTestRide(opts: CreateRideOptions): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("_test_create_ride", {
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

  if (error) throw new Error(`Failed to create test ride: ${error.message}`);
  return data as string;
}
