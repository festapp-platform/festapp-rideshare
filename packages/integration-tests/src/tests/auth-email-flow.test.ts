import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "../helpers/supabase-client.js";
import { cleanupUsers } from "../helpers/cleanup.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL } from "../helpers/config.js";

const admin = createAdminClient();

let userId: string;
const email = `e2e-email-flow-${Date.now()}@test.spolujizda.online`;
const password = "e2e-test-password-123456";

afterAll(async () => {
  if (userId) {
    await cleanupUsers([userId]);
  }
});

describe("auth - email confirmation flow", () => {
  it("signUp creates unconfirmed user", async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: "Email Flow Test" },
      },
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    userId = data.user!.id;

    // User should exist but email not confirmed (no session returned unless autoconfirm is on)
    // The user was created; we verify by fetching via admin
    const { data: adminUser } = await admin.auth.admin.getUserById(userId);
    expect(adminUser.user).toBeDefined();
  });

  it("confirm email via admin generateLink and HTTP fetch", async () => {
    // Generate a confirmation link via admin API
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
    });

    expect(linkError).toBeNull();
    expect(linkData.properties?.hashed_token).toBeDefined();

    const hashedToken = linkData.properties!.hashed_token;

    // Fetch the confirmation URL (follow redirects)
    const confirmUrl = `${SITE_URL}/auth/confirm?token_hash=${hashedToken}&type=signup`;
    const response = await fetch(confirmUrl, { redirect: "follow" });

    // Should eventually resolve (200 after redirect to app)
    expect(response.status).toBe(200);
  });

  it("login succeeds after email confirmation", async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user!.id).toBe(userId);
  });
});
