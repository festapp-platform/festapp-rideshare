/**
 * Shared Supabase client factories for Edge Functions.
 *
 * createAdminClient() - Bypasses RLS, uses service_role key. For system operations only.
 * createUserClient(authHeader) - Respects RLS, scoped to the calling user.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Create an admin Supabase client that bypasses RLS.
 * Only use for operations that require elevated privileges (e.g., deleting users).
 */
export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Create a user-scoped Supabase client that respects RLS.
 * Pass the Authorization header from the incoming request.
 */
export function createUserClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    },
  );
}
