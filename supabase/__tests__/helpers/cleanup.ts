import { createAdminClient } from "./supabase-client";

/** Delete test users by IDs. Auth user deletion cascades to profiles and all FK-linked data. */
export async function cleanupUsers(userIds: string[]): Promise<void> {
  const admin = createAdminClient();
  for (const id of userIds) {
    try {
      await admin.auth.admin.deleteUser(id);
    } catch {
      // Best-effort cleanup — user may already be deleted
    }
  }
}
