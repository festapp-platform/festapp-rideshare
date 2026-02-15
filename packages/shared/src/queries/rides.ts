import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

type RideInsert = Database['public']['Tables']['rides']['Insert'];
type RideUpdate = Database['public']['Tables']['rides']['Update'];

/**
 * Ride CRUD query builders.
 *
 * All functions take a typed SupabaseClient as the first argument
 * so they work with both server-side and client-side Supabase clients.
 */

/** Fetch a single ride by ID with driver profile and vehicle info. */
export function getRideById(client: SupabaseClient<Database>, id: string) {
  return client
    .from('rides')
    .select(
      '*, profiles:driver_id(display_name, avatar_url, rating_avg, rating_count), vehicles:vehicle_id(make, model, color, license_plate, photo_url)',
    )
    .eq('id', id)
    .single();
}

/** Fetch rides for a specific driver, ordered by departure time descending. */
export function getDriverRides(
  client: SupabaseClient<Database>,
  driverId: string,
  options?: { status?: string; limit?: number },
) {
  let query = client
    .from('rides')
    .select('*')
    .eq('driver_id', driverId)
    .order('departure_time', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query;
}

/** Insert a new ride. */
export function createRide(
  client: SupabaseClient<Database>,
  data: RideInsert,
) {
  return client.from('rides').insert(data).select().single();
}

/** Update a ride by ID. */
export function updateRide(
  client: SupabaseClient<Database>,
  id: string,
  data: RideUpdate,
) {
  return client.from('rides').update(data).eq('id', id).select().single();
}

/** Delete a ride by ID. */
export function deleteRide(client: SupabaseClient<Database>, id: string) {
  return client.from('rides').delete().eq('id', id);
}

/** Fetch waypoints for a ride, ordered by order_index. */
export function getRideWaypoints(
  client: SupabaseClient<Database>,
  rideId: string,
) {
  return client
    .from('ride_waypoints')
    .select('*')
    .eq('ride_id', rideId)
    .order('order_index', { ascending: true });
}
