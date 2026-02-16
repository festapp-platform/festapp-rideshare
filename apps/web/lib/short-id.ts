import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@festapp/shared';

/**
 * Fetch a ride by its short_id, including driver profile and vehicle info.
 * Same select shape as getRideById but filtered by short_id.
 */
export function getRideByShortId(client: SupabaseClient<Database>, shortId: string) {
  return client
    .from('rides')
    .select(
      '*, profiles:driver_id(display_name, avatar_url, rating_avg, rating_count), vehicles:vehicle_id(make, model, color, license_plate, photo_url)',
    )
    .eq('short_id', shortId)
    .single();
}

/**
 * Fetch a profile by its short_id.
 */
export function getProfileByShortId(client: SupabaseClient<Database>, shortId: string) {
  return client
    .from('profiles')
    .select('*')
    .eq('short_id', shortId)
    .single();
}
