import { createClient } from "@supabase/supabase-js";
import { createTestUser, type TestUser } from "../helpers/test-user.js";
import { createAdminClient } from "../helpers/supabase-client.js";
import { cleanupUsers } from "../helpers/cleanup.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../helpers/config.js";

let user: TestUser;
const admin = createAdminClient();

beforeAll(async () => {
  user = await createTestUser("Edge Function User");
});

afterAll(async () => {
  await cleanupUsers([user.id]);
});

// Minimal valid 1x1 PNG
const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
  0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

/** Helper: sign in as test user and get a supabase client with session */
async function getAuthenticatedClient() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error || !data.session) throw new Error(`Sign-in failed: ${error?.message}`);
  return client;
}

describe("upload-image edge function", () => {
  it("uploads avatar image and returns publicUrl", async () => {
    const client = await getAuthenticatedClient();

    const formData = new FormData();
    formData.append("file", new Blob([pngBytes], { type: "image/png" }), "test-avatar.png");
    formData.append("bucket", "avatars");

    // Use supabase.functions.invoke — same as the web app does
    const { data, error } = await client.functions.invoke("upload-image", {
      body: formData,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.publicUrl).toBeDefined();
    expect(data.publicUrl).toContain("avatars");

    // Cleanup uploaded file
    try {
      const filePath = data.publicUrl.split("/avatars/")[1];
      if (filePath) {
        await admin.storage.from("avatars").remove([filePath]);
      }
    } catch {
      // Best-effort cleanup
    }
  });

  it("uploads vehicle photo and returns publicUrl", async () => {
    const client = await getAuthenticatedClient();

    const formData = new FormData();
    formData.append("file", new Blob([pngBytes], { type: "image/png" }), "test-vehicle.png");
    formData.append("bucket", "vehicles");

    const { data, error } = await client.functions.invoke("upload-image", {
      body: formData,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.publicUrl).toBeDefined();
    expect(data.publicUrl).toContain("vehicles");

    // Cleanup
    try {
      const filePath = data.publicUrl.split("/vehicles/")[1];
      if (filePath) {
        await admin.storage.from("vehicles").remove([filePath]);
      }
    } catch {
      // Best-effort cleanup
    }
  });

  it("rejects upload without authentication", async () => {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const formData = new FormData();
    formData.append("file", new Blob([pngBytes], { type: "image/png" }), "test.png");
    formData.append("bucket", "avatars");

    const { data, error } = await anonClient.functions.invoke("upload-image", {
      body: formData,
    });

    // Should fail — either gateway rejects (FunctionsHttpError) or function returns 401
    expect(error || (data && data.error)).toBeTruthy();
  });

  it("rejects invalid bucket name", async () => {
    const client = await getAuthenticatedClient();

    const formData = new FormData();
    formData.append("file", new Blob([pngBytes], { type: "image/png" }), "test.png");
    formData.append("bucket", "nonexistent");

    const { data, error } = await client.functions.invoke("upload-image", {
      body: formData,
    });

    // Should get a 400 error about invalid bucket
    expect(error || (data && data.error)).toBeTruthy();
  });

  it("rejects request without file", async () => {
    const client = await getAuthenticatedClient();

    const formData = new FormData();
    formData.append("bucket", "avatars");

    const { data, error } = await client.functions.invoke("upload-image", {
      body: formData,
    });

    expect(error || (data && data.error)).toBeTruthy();
  });
});
