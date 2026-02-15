import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Route intent (flexible ride) query builders.
 *
 * All functions take a typed SupabaseClient as the first argument
 * so they work with both server-side and client-side Supabase clients.
 */

/** Fetch active route intents with driver profile info. */
export function getActiveRouteIntents(client: SupabaseClient<Database>) {
  return client
    .from('route_intents')
    .select(
      '*, profiles:driver_id(display_name, avatar_url, rating_avg, rating_count)',
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false });
}

/** Fetch a single route intent by ID with driver profile info. */
export function getRouteIntentById(
  client: SupabaseClient<Database>,
  id: string,
) {
  return client
    .from('route_intents')
    .select(
      '*, profiles:driver_id(display_name, avatar_url, rating_avg, rating_count)',
    )
    .eq('id', id)
    .single();
}

/** Fetch a driver's own route intents (any status). */
export function getMyRouteIntents(
  client: SupabaseClient<Database>,
  driverId: string,
) {
  return client
    .from('route_intents')
    .select(
      '*, profiles:driver_id(display_name, avatar_url, rating_avg, rating_count)',
    )
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });
}

/** Fetch intents a user is subscribed to. */
export function getMySubscriptions(
  client: SupabaseClient<Database>,
  userId: string,
) {
  return client
    .from('route_intent_subscriptions')
    .select(
      '*, route_intents:route_intent_id(*, profiles:driver_id(display_name, avatar_url, rating_avg, rating_count))',
    )
    .eq('subscriber_id', userId)
    .order('created_at', { ascending: false });
}

/** Check if a user is subscribed to a route intent. */
export function isSubscribed(
  client: SupabaseClient<Database>,
  intentId: string,
  userId: string,
) {
  return client
    .from('route_intent_subscriptions')
    .select('id')
    .eq('route_intent_id', intentId)
    .eq('subscriber_id', userId)
    .maybeSingle();
}
