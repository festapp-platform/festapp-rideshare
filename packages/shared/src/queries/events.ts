import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Event query builders.
 *
 * All functions take a typed SupabaseClient as the first argument
 * so they work with both server-side and client-side Supabase clients.
 */

/** List approved events ordered by event_date (upcoming first). */
export function getApprovedEvents(client: SupabaseClient<Database>) {
  return client
    .from('events')
    .select(
      'id, name, description, location_address, event_date, event_end_date, created_at, creator:profiles!events_creator_id_fkey(id, display_name, avatar_url)',
    )
    .eq('status', 'approved')
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true });
}

/** Single event with creator profile info. */
export function getEventById(
  client: SupabaseClient<Database>,
  id: string,
) {
  return client
    .from('events')
    .select(
      '*, creator:profiles!events_creator_id_fkey(id, display_name, avatar_url, rating_avg)',
    )
    .eq('id', id)
    .single();
}

/** User's created events (all statuses). */
export function getMyEvents(
  client: SupabaseClient<Database>,
  userId: string,
) {
  return client
    .from('events')
    .select('id, name, description, location_address, event_date, event_end_date, status, admin_notes, created_at')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });
}

/** Admin: all pending events for review. */
export function getPendingEventsForAdmin(client: SupabaseClient<Database>) {
  return client
    .from('events')
    .select(
      '*, creator:profiles!events_creator_id_fkey(id, display_name, avatar_url)',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
}

/** Get rides for an event via the get_event_rides RPC. */
export function getEventRides(
  client: SupabaseClient<Database>,
  eventId: string,
) {
  return client.rpc('get_event_rides', { p_event_id: eventId });
}
