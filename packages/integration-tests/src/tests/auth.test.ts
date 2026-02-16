import { createClient } from "@supabase/supabase-js";
import { createTestUser, type TestUser } from "../helpers/test-user.js";
import { cleanupUsers } from "../helpers/cleanup.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../helpers/config.js";

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("Auth Test User");
});

afterAll(async () => {
  await cleanupUsers([user.id]);
});

describe("auth - basic flows", () => {
  it("login with signInWithPassword returns correct user", async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user!.id).toBe(user.id);
    expect(data.user!.email).toBe(user.email);
  });

  it("login with wrong password returns error", async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await client.auth.signInWithPassword({
      email: user.email,
      password: "wrong-password-12345",
    });

    expect(error).not.toBeNull();
  });

  it("login with non-existent email returns error", async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await client.auth.signInWithPassword({
      email: `nonexistent-${Date.now()}@test.spolujizda.online`,
      password: "any-password-12345",
    });

    expect(error).not.toBeNull();
  });

  it("update password then re-login with new password", async () => {
    const newPassword = "e2e-new-password-789012";

    // Update password via authenticated client
    const { error: updateError } = await user.client.auth.updateUser({
      password: newPassword,
    });
    expect(updateError).toBeNull();

    // Login with new password
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email: user.email,
      password: newPassword,
    });

    expect(error).toBeNull();
    expect(data.user!.id).toBe(user.id);

    // Restore original password for other tests
    const { error: restoreError } = await user.client.auth.updateUser({
      password: user.password,
    });
    expect(restoreError).toBeNull();
  });

  it("signOut then getUser returns null", async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Sign in first
    await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    // Sign out
    const { error: signOutError } = await client.auth.signOut();
    expect(signOutError).toBeNull();

    // getUser should return no user
    const { data: { user: currentUser } } = await client.auth.getUser();
    expect(currentUser).toBeNull();
  });
});
