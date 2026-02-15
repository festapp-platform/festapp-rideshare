import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Booking query builders.
 *
 * All functions take a typed SupabaseClient as the first argument
 * so they work with both server-side and client-side Supabase clients.
 */

/** Fetch all bookings for a ride with passenger profile info. */
export function getBookingsForRide(
  client: SupabaseClient<Database>,
  rideId: string,
) {
  return client
    .from('bookings')
    .select(
      '*, profiles:passenger_id(display_name, avatar_url, rating_avg)',
    )
    .eq('ride_id', rideId)
    .order('created_at', { ascending: true });
}

/** Fetch bookings for a passenger with ride and driver info. */
export function getPassengerBookings(
  client: SupabaseClient<Database>,
  passengerId: string,
) {
  return client
    .from('bookings')
    .select(`
      *,
      rides:ride_id(
        id, origin_address, destination_address, departure_time,
        seats_total, seats_available, price_czk, status, driver_id,
        profiles:driver_id(display_name, avatar_url, rating_avg)
      )
    `)
    .eq('passenger_id', passengerId)
    .order('created_at', { ascending: false });
}

/** Fetch a single booking by ID with ride and passenger profile. */
export function getBookingById(
  client: SupabaseClient<Database>,
  bookingId: string,
) {
  return client
    .from('bookings')
    .select(`
      *,
      rides:ride_id(
        id, origin_address, destination_address, departure_time,
        seats_total, seats_available, price_czk, status, driver_id,
        profiles:driver_id(display_name, avatar_url, rating_avg)
      ),
      profiles:passenger_id(display_name, avatar_url, rating_avg)
    `)
    .eq('id', bookingId)
    .single();
}
