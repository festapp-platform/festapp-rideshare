/**
 * Upload Image Edge Function.
 *
 * Single endpoint for all image uploads (avatars, vehicle photos, ID documents).
 * Uses service_role to bypass RLS. Generates random UUID filenames.
 *
 * Accepts multipart FormData:
 *   - file: The image file (required)
 *   - bucket: Storage bucket name — "avatars" or "vehicles" (required)
 *   - folder: Subfolder path, defaults to user ID from JWT (optional)
 *
 * Returns:
 *   200 - { publicUrl: string }
 *   400 - Invalid request
 *   401 - Unauthorized
 *   500 - Upload failed
 */
import { createAdminClient, createUserClient } from "../_shared/supabase-client.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_BUCKETS = new Set(["avatars", "vehicles"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // Validate auth — extract user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userClient = createUserClient(authHeader);
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse FormData
    const formData = await req.formData();
    const file = formData.get("file");
    const bucket = formData.get("bucket") as string | null;
    const folder = (formData.get("folder") as string | null) || user.id;

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
      return new Response(
        JSON.stringify({ error: `Invalid bucket. Allowed: ${[...ALLOWED_BUCKETS].join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate random filename
    const ext = file.name?.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const fileName = `${crypto.randomUUID()}.${safeExt}`;
    const filePath = `${folder}/${fileName}`;

    // Upload via admin client (service_role bypasses RLS)
    const adminClient = createAdminClient();
    const { error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get public URL
    const { data: { publicUrl } } = adminClient.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({ publicUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
