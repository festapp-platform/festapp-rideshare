import { createTestUser, type TestUser } from "../helpers/test-user.js";
import { createAdminClient } from "../helpers/supabase-client.js";
import { cleanupUsers } from "../helpers/cleanup.js";

const admin = createAdminClient();

let user1: TestUser;
let user2: TestUser;

beforeAll(async () => {
  user1 = await createTestUser("Profile Test User 1");
  user2 = await createTestUser("Profile Test User 2");
});

afterAll(async () => {
  await cleanupUsers([user1.id, user2.id]);
});

describe("profiles", () => {
  it("new user has profile with correct display_name", async () => {
    const { data, error } = await admin
      .from("profiles")
      .select("id, display_name")
      .eq("id", user1.id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.display_name).toBe("Profile Test User 1");
  });

  it("user can update own display_name and bio", async () => {
    const { error: updateError } = await user1.client
      .from("profiles")
      .update({ display_name: "Updated Name", bio: "Hello from E2E" })
      .eq("id", user1.id);

    expect(updateError).toBeNull();

    // Verify the update persisted
    const { data, error } = await admin
      .from("profiles")
      .select("display_name, bio")
      .eq("id", user1.id)
      .single();

    expect(error).toBeNull();
    expect(data!.display_name).toBe("Updated Name");
    expect(data!.bio).toBe("Hello from E2E");
  });

  it("user can read another user's profile", async () => {
    const { data, error } = await user1.client
      .from("profiles")
      .select("id, display_name")
      .eq("id", user2.id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.id).toBe(user2.id);
    expect(data!.display_name).toBe("Profile Test User 2");
  });
});
