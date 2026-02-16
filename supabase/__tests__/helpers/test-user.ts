import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, SUPABASE_URL, ANON_KEY } from "./supabase-client";

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

let userCounter = 0;

/**
 * Creates a real auth user in local Supabase.
 * The on_auth_user_created trigger auto-creates a profile row.
 * Returns an authenticated Supabase client scoped to that user for RLS testing.
 */
export async function createTestUser(displayName?: string): Promise<TestUser> {
  userCounter++;
  const email = `test-${Date.now()}-${userCounter}@integration.test`;
  const password = "test-password-123456";

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName ?? `Test User ${userCounter}` },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  // Update display_name on profile (trigger sets from raw_user_meta_data)
  if (displayName) {
    await admin.from("profiles").update({ display_name: displayName }).eq("id", data.user.id);
  }

  // Create authenticated client for this user
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await userClient.auth.signInWithPassword({ email, password });

  return { id: data.user.id, email, client: userClient };
}

/** Delete a test user — cascades through profiles and all FK-linked data. */
export async function deleteTestUser(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
}
