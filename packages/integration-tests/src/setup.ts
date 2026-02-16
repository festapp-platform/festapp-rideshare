import { createAdminClient } from "./helpers/supabase-client.js";
import { cleanupStaleTestData, globalCleanup } from "./helpers/cleanup.js";

beforeAll(async () => {
  // Verify Supabase connectivity
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").select("id").limit(1);
  if (error) {
    throw new Error(
      `Supabase not reachable. Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\nError: ${error.message}`,
    );
  }

  // Clean up stale test data from previous failed runs
  await cleanupStaleTestData();
});

afterAll(async () => {
  // Global safety net — clean up everything registered during this run
  await globalCleanup();
});
