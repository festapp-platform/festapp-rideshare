import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Review, report, and moderation query builders.
 *
 * All functions take a typed SupabaseClient as the first argument
 * so they work with both server-side and client-side Supabase clients.
 */

/** Reviews for a user's profile page (only revealed). */
export function getReviewsForUser(
  client: SupabaseClient<Database>,
  userId: string,
) {
  return client
    .from('reviews')
    .select(
      'id, rating, comment, created_at, revealed_at, reviewer:reviewer_id(id, display_name, avatar_url)',
    )
    .eq('reviewee_id', userId)
    .not('revealed_at', 'is', null)
    .order('created_at', { ascending: false });
}

/** Check if current user has already reviewed a specific booking. */
export function getExistingReview(
  client: SupabaseClient<Database>,
  bookingId: string,
  userId: string,
) {
  return client
    .from('reviews')
    .select('id, rating, comment')
    .eq('booking_id', bookingId)
    .eq('reviewer_id', userId)
    .maybeSingle();
}

/** Admin: get all reports with reporter and reported user info. */
export function getReportsForAdmin(
  client: SupabaseClient<Database>,
  status?: string,
) {
  let query = client
    .from('reports')
    .select(
      '*, reporter:reporter_id(id, display_name, avatar_url), reported_user:reported_user_id(id, display_name, avatar_url)',
    )
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  return query;
}

/** Admin: get single report with full context. */
export function getReportById(
  client: SupabaseClient<Database>,
  reportId: string,
) {
  return client
    .from('reports')
    .select(
      '*, reporter:reporter_id(id, display_name, avatar_url, account_status), reported_user:reported_user_id(id, display_name, avatar_url, account_status, rating_avg, rating_count, completed_rides_count)',
    )
    .eq('id', reportId)
    .single();
}

/** Admin: get moderation history for a user. */
export function getModerationHistory(
  client: SupabaseClient<Database>,
  userId: string,
) {
  return client
    .from('moderation_actions')
    .select('*, admin:admin_id(display_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

/** Admin: get platform stats for date range. */
export function getPlatformStats(
  client: SupabaseClient<Database>,
  startDate: string,
  endDate: string,
) {
  return client
    .from('platform_stats_daily')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
}

/** Admin: get platform overview (latest stats). */
export function getPlatformOverview(client: SupabaseClient<Database>) {
  return client
    .from('platform_stats_daily')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
}

/** Admin: search users for moderation (by name). */
export function searchUsersForAdmin(
  client: SupabaseClient<Database>,
  query: string,
) {
  return client
    .from('profiles')
    .select(
      'id, display_name, avatar_url, account_status, rating_avg, rating_count, completed_rides_count, created_at',
    )
    .ilike('display_name', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(50);
}

/** Admin: get all reviews (for review management, including hidden). */
export function getReviewsForAdmin(client: SupabaseClient<Database>) {
  return client
    .from('reviews')
    .select(
      '*, reviewer:reviewer_id(id, display_name, avatar_url), reviewee:reviewee_id(id, display_name, avatar_url)',
    )
    .order('created_at', { ascending: false });
}
