import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Chat and notification query builders.
 *
 * All functions take a typed SupabaseClient as the first argument
 * so they work with both server-side and client-side Supabase clients.
 */

/** Fetch all conversations for a user with ride info and participant profiles. */
export function getConversationsForUser(
  client: SupabaseClient<Database>,
  userId: string,
) {
  return client
    .from('chat_conversations')
    .select(
      `
      *,
      rides:ride_id(id, origin_address, destination_address, departure_time),
      driver:profiles!chat_conversations_driver_id_fkey(display_name, avatar_url),
      passenger:profiles!chat_conversations_passenger_id_fkey(display_name, avatar_url)
    `,
    )
    .or(`driver_id.eq.${userId},passenger_id.eq.${userId}`)
    .order('created_at', { ascending: false });
}

/** Fetch messages for a conversation with cursor-based pagination. */
export function getMessages(
  client: SupabaseClient<Database>,
  conversationId: string,
  limit = 50,
  before?: string,
) {
  let query = client
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  return query;
}

/** Get total unread message count across all conversations (via RPC). */
export function getUnreadCount(client: SupabaseClient<Database>) {
  return client.rpc('get_unread_count');
}

/** Fetch notification preferences for the current user. */
export function getNotificationPreferences(
  client: SupabaseClient<Database>,
) {
  return client
    .from('notification_preferences')
    .select('*')
    .single();
}

/** Upsert notification preferences for the current user. */
export function upsertNotificationPreferences(
  client: SupabaseClient<Database>,
  prefs: Database['public']['Tables']['notification_preferences']['Insert'],
) {
  return client
    .from('notification_preferences')
    .upsert(prefs, { onConflict: 'user_id' })
    .select()
    .single();
}
