import { createClient } from "@supabase/supabase-js";
import { createTestUser, type TestUser } from "../helpers/test-user.js";
import { createAdminClient } from "../helpers/supabase-client.js";
import { cleanupUsers } from "../helpers/cleanup.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL } from "../helpers/config.js";

const admin = createAdminClient();
let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("Password Reset User");
});

afterAll(async () => {
  await cleanupUsers([user.id]);
});

describe("auth - password reset flow", () => {
  it("reset password via admin generateLink and re-login", async () => {
    // Generate a recovery link via admin API
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: user.email,
    });

    expect(linkError).toBeNull();
    expect(linkData.properties?.hashed_token).toBeDefined();

    const hashedToken = linkData.properties!.hashed_token;

    // Fetch the recovery URL (follow redirects)
    const confirmUrl = `${SITE_URL}/auth/confirm?token_hash=${hashedToken}&type=recovery`;
    const response = await fetch(confirmUrl, { redirect: "follow" });

    // Should resolve (200 after redirect)
    expect(response.status).toBe(200);

    // Now update the password using the user's existing session
    const newPassword = "e2e-reset-password-999888";
    const { error: updateError } = await user.client.auth.updateUser({
      password: newPassword,
    });
    expect(updateError).toBeNull();

    // Login with the new password
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email: user.email,
      password: newPassword,
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user!.id).toBe(user.id);
  });
});
