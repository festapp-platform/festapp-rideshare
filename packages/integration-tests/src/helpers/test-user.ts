import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase-client.js";
import { registry } from "./cleanup.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export interface TestUser {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
}

let userCounter = 0;

/**
 * Creates a real auth user in production Supabase.
 * The on_auth_user_created trigger auto-creates a profile row.
 * Returns an authenticated Supabase client scoped to that user for RLS testing.
 *
 * Users are automatically registered in the global cleanup registry,
 * so they get deleted even if per-file afterAll fails.
 */
export async function createTestUser(displayName?: string): Promise<TestUser> {
  userCounter++;
  const email = `e2e-${Date.now()}-${userCounter}@test.spolujizda.online`;
  const password = "e2e-test-password-123456";

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

  // Register for global cleanup (safety net)
  registry.registerUser(data.user.id);

  // Update display_name on profile if provided (trigger sets from raw_user_meta_data)
  if (displayName) {
    await admin.from("profiles").update({ display_name: displayName }).eq("id", data.user.id);
  }

  // Create authenticated client for this user
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await userClient.auth.signInWithPassword({ email, password });

  return { id: data.user.id, email, password, client: userClient };
}
