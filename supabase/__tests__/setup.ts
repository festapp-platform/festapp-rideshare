import { createAdminClient } from "./helpers/supabase-client";

beforeAll(async () => {
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").select("id").limit(1);
  if (error) {
    throw new Error(
      `Local Supabase not reachable. Run 'supabase start' first.\nError: ${error.message}`,
    );
  }
});
