import { createAdminClient } from "./supabase-client.js";

/** Delete test users by IDs. Auth user deletion cascades to profiles and all FK-linked data. */
export async function cleanupUsers(userIds: string[]): Promise<void> {
  const admin = createAdminClient();
  for (const id of userIds) {
    try {
      await admin.auth.admin.deleteUser(id);
    } catch {
      // Best-effort cleanup -- user may already be deleted
    }
  }
}

/** Delete OTP codes for a phone number (or all if no phone provided). */
export async function cleanupOtpCodes(phone?: string): Promise<void> {
  const admin = createAdminClient();
  try {
    if (phone) {
      await admin.from("_test_otp_codes").delete().eq("phone", phone);
    } else {
      await admin.from("_test_otp_codes").delete().neq("phone", "");
    }
  } catch {
    // Best-effort cleanup
  }
}
