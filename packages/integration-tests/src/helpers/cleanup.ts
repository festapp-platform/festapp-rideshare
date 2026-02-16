import { createAdminClient } from "./supabase-client.js";

/**
 * Safety domain — test users MUST use this email domain.
 * Cleanup functions refuse to delete anything outside this domain.
 */
const TEST_EMAIL_DOMAIN = "@test.spolujizda.online";

/**
 * Global registry of resources created during tests.
 * Every helper that creates a resource registers it here.
 * Global teardown sweeps everything, even if per-file afterAll fails.
 */
class TestRegistry {
  readonly userIds = new Set<string>();
  readonly rideIds = new Set<string>();
  readonly storageFiles: { bucket: string; path: string }[] = [];
  readonly otpPhones = new Set<string>();

  registerUser(id: string) {
    this.userIds.add(id);
  }

  registerRide(id: string) {
    this.rideIds.add(id);
  }

  registerStorageFile(bucket: string, path: string) {
    this.storageFiles.push({ bucket, path });
  }

  registerOtpPhone(phone: string) {
    this.otpPhones.add(phone);
  }
}

export const registry = new TestRegistry();

/**
 * Delete test users by IDs — with safety check.
 * Only deletes users whose email matches the test domain.
 * Auth user deletion cascades to profiles and all FK-linked data.
 */
export async function cleanupUsers(userIds: string[]): Promise<void> {
  const admin = createAdminClient();
  for (const id of userIds) {
    try {
      // Safety: verify the user has a test email before deleting
      const { data } = await admin.auth.admin.getUserById(id);
      if (!data.user?.email?.endsWith(TEST_EMAIL_DOMAIN)) {
        console.warn(
          `SAFETY: Refusing to delete user ${id} — email "${data.user?.email}" is not a test account`,
        );
        continue;
      }
      await admin.auth.admin.deleteUser(id);
    } catch {
      // Best-effort — user may already be deleted
    }
  }
}

/** Delete rides by IDs (via admin, bypasses RLS). */
export async function cleanupRides(rideIds: string[]): Promise<void> {
  if (rideIds.length === 0) return;
  const admin = createAdminClient();
  try {
    await admin.from("rides").delete().in("id", rideIds);
  } catch {
    // Best-effort
  }
}

/** Delete storage files by bucket and path. */
export async function cleanupStorageFiles(
  files: { bucket: string; path: string }[],
): Promise<void> {
  if (files.length === 0) return;
  const admin = createAdminClient();
  const byBucket = new Map<string, string[]>();
  for (const f of files) {
    const arr = byBucket.get(f.bucket) ?? [];
    arr.push(f.path);
    byBucket.set(f.bucket, arr);
  }
  for (const [bucket, paths] of byBucket) {
    try {
      await admin.storage.from(bucket).remove(paths);
    } catch {
      // Best-effort
    }
  }
}

/** Delete OTP codes for a phone number. */
export async function cleanupOtpCodes(phone?: string): Promise<void> {
  const admin = createAdminClient();
  try {
    if (phone) {
      await admin.from("_test_otp_codes").delete().eq("phone", phone);
    } else {
      await admin.from("_test_otp_codes").delete().neq("phone", "");
    }
  } catch {
    // Best-effort
  }
}

/**
 * Global cleanup — sweeps ALL registered resources.
 * Called from globalTeardown (runs even if individual tests crash).
 */
export async function globalCleanup(): Promise<void> {
  // 1. Delete rides first (FK to users)
  await cleanupRides([...registry.rideIds]);

  // 2. Delete storage files
  await cleanupStorageFiles(registry.storageFiles);

  // 3. Delete OTP codes
  for (const phone of registry.otpPhones) {
    await cleanupOtpCodes(phone);
  }

  // 4. Delete users last (cascades remaining FK data)
  await cleanupUsers([...registry.userIds]);
}

/**
 * Stale cleanup — find and delete test users left from previous failed runs.
 * Only targets users with @test.spolujizda.online emails.
 * Runs at the start of the test suite.
 */
export async function cleanupStaleTestData(): Promise<void> {
  const admin = createAdminClient();
  try {
    // List all auth users and find stale test accounts
    // Supabase admin.listUsers paginates; we check first page (up to 1000)
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (!data?.users) return;

    const staleUserIds = data.users
      .filter((u) => u.email?.endsWith(TEST_EMAIL_DOMAIN))
      .map((u) => u.id);

    if (staleUserIds.length > 0) {
      console.log(
        `Cleaning up ${staleUserIds.length} stale test user(s) from previous run...`,
      );
      await cleanupUsers(staleUserIds);
    }

    // Clean up stale OTP codes
    await cleanupOtpCodes();
  } catch (err) {
    console.warn("Stale cleanup failed (non-fatal):", err);
  }
}
