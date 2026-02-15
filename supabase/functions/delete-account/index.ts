/**
 * Delete Account Edge Function (AUTH-05).
 *
 * Allows authenticated users to delete their own account.
 * Required by Apple App Store guidelines.
 *
 * Flow:
 *   1. Verify caller identity via Authorization header (user-scoped client)
 *   2. Delete user via admin client with service_role key
 *   3. CASCADE on profiles FK handles data cleanup automatically
 *
 * Returns:
 *   200 - Account deleted successfully
 *   401 - Unauthorized (missing or invalid auth header)
 *   500 - Server error during deletion
 */
import { createAdminClient, createUserClient } from "../_shared/supabase-client.ts";

Deno.serve(async (req) => {
  try {
    // Verify caller identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const userClient = createUserClient(authHeader);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Delete user via admin client (CASCADE handles profile cleanup)
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("Failed to delete user:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error in delete-account:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
