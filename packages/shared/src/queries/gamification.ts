import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Gamification query builders for RPCs and badge_definitions table.
 */

/** Get impact stats for a user (defaults to current user). */
export function getUserImpact(
  client: SupabaseClient<Database>,
  userId?: string,
) {
  return client.rpc('get_user_impact', userId ? { p_user_id: userId } : {});
}

/** Get earned badges for a user (defaults to current user). */
export function getUserBadges(
  client: SupabaseClient<Database>,
  userId?: string,
) {
  return client.rpc('get_user_badges', userId ? { p_user_id: userId } : {});
}

/** Get route streaks for a user (defaults to current user). */
export function getRouteStreaks(
  client: SupabaseClient<Database>,
  userId?: string,
) {
  return client.rpc('get_route_streaks', userId ? { p_user_id: userId } : {});
}

/** Fetch all badge definitions (for showing progress to unearned badges). */
export function getAllBadges(client: SupabaseClient<Database>) {
  return client
    .from('badge_definitions')
    .select('*')
    .order('category')
    .order('threshold', { ascending: true });
}
