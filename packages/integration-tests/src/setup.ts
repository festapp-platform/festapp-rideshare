import { createAdminClient } from "./helpers/supabase-client.js";

beforeAll(async () => {
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").select("id").limit(1);
  if (error) {
    throw new Error(
      `Supabase not reachable. Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\nError: ${error.message}`,
    );
  }
});
