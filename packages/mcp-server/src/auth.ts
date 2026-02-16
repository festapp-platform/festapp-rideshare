/**
 * Supabase auth helper for MCP server context.
 *
 * Creates authenticated Supabase clients scoped to the user's JWT
 * or using service_role key for elevated operations.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client with optional user JWT for RLS-scoped access.
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseKey - Service role key or anon key
 * @param userJwt - Optional user JWT for RLS-scoped access
 */
export function getSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string,
  userJwt?: string,
): SupabaseClient {
  const options = userJwt
    ? {
        global: {
          headers: { Authorization: `Bearer ${userJwt}` },
        },
      }
    : undefined;

  return createClient(supabaseUrl, supabaseKey, options);
}

/**
 * Convenience function that reads environment variables and creates
 * an authenticated Supabase client.
 *
 * Environment variables:
 * - SUPABASE_URL (required)
 * - SUPABASE_SERVICE_ROLE_KEY (required)
 * - SUPABASE_USER_JWT (optional - enables RLS-scoped access)
 */
export function getAuthenticatedClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userJwt = process.env.SUPABASE_USER_JWT;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL environment variable is required");
  }
  if (!supabaseKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is required",
    );
  }

  return getSupabaseClient(supabaseUrl, supabaseKey, userJwt);
}
