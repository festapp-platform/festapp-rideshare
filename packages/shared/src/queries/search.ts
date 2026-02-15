import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Search query builders for the nearby_rides RPC function.
 *
 * The RPC function performs PostGIS corridor matching using ST_DWithin
 * against both the ride route geometry and origin/destination points.
 */

export interface SearchParams {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  /** ISO date string (YYYY-MM-DD) */
  searchDate: string;
  /** Search radius in km (default 15) */
  radiusKm?: number;
  /** Maximum results to return (default 50) */
  maxResults?: number;
}

/** Result type matching the nearby_rides RPC return columns. */
export type NearbyRideResult =
  Database['public']['Functions']['nearby_rides']['Returns'][number];

/** Search for rides near the given origin and destination using PostGIS corridor matching. */
export function searchNearbyRides(
  client: SupabaseClient<Database>,
  params: SearchParams,
) {
  return client.rpc('nearby_rides', {
    origin_lat: params.originLat,
    origin_lng: params.originLng,
    dest_lat: params.destLat,
    dest_lng: params.destLng,
    search_date: params.searchDate,
    radius_km: params.radiusKm ?? 15,
    max_results: params.maxResults ?? 50,
  });
}
