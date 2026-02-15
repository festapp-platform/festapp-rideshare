/**
 * Web image compression and upload helpers.
 *
 * Compresses images client-side with browser-image-compression, then uploads
 * via the upload-image Edge Function (service_role, random UUID filenames).
 */
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS, IMAGE_CONSTRAINTS } from "@festapp/shared";

/**
 * Upload a file via the upload-image Edge Function.
 * Returns the public URL of the uploaded file.
 */
async function invokeUpload(
  file: File | Blob,
  bucket: string,
  folder?: string,
): Promise<string> {
  const supabase = createClient();

  const formData = new FormData();
  formData.append("file", file, file instanceof File ? file.name : "image.jpg");
  formData.append("bucket", bucket);
  if (folder) formData.append("folder", folder);

  const { data, error } = await supabase.functions.invoke("upload-image", {
    body: formData,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  if (!data?.publicUrl) {
    throw new Error("Upload failed: no public URL returned");
  }

  return data.publicUrl;
}

/**
 * Compress and upload an avatar image.
 * Updates the user's profile avatar_url with the new public URL.
 */
export async function uploadAvatar(
  file: File,
  userId: string,
): Promise<string> {
  const supabase = createClient();

  // Compress image client-side
  let compressed: File;
  try {
    compressed = await imageCompression(file, {
      maxSizeMB: IMAGE_CONSTRAINTS.avatar.maxSizeMB,
      maxWidthOrHeight: IMAGE_CONSTRAINTS.avatar.maxWidthOrHeight,
      useWebWorker: true,
    });
  } catch (error) {
    throw new Error(
      `Failed to compress avatar image: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  // Upload via Edge Function
  const publicUrl = await invokeUpload(compressed, STORAGE_BUCKETS.avatars, userId);

  // Update profile with new avatar URL
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (updateError) {
    throw new Error(
      `Failed to update profile avatar URL: ${updateError.message}`,
    );
  }

  return publicUrl;
}

/**
 * Compress and upload a vehicle photo.
 */
export async function uploadVehiclePhoto(
  file: File,
  userId: string,
  vehicleId: string,
): Promise<string> {
  // Compress image client-side
  let compressed: File;
  try {
    compressed = await imageCompression(file, {
      maxSizeMB: IMAGE_CONSTRAINTS.vehicle.maxSizeMB,
      maxWidthOrHeight: IMAGE_CONSTRAINTS.vehicle.maxWidthOrHeight,
      useWebWorker: true,
    });
  } catch (error) {
    throw new Error(
      `Failed to compress vehicle photo: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  // Upload via Edge Function — folder is userId for ownership grouping
  const publicUrl = await invokeUpload(compressed, STORAGE_BUCKETS.vehicles, userId);

  return publicUrl;
}

/**
 * Upload an ID document image via Edge Function.
 */
export async function uploadIdDocument(
  file: File,
  userId: string,
): Promise<string> {
  // Compress image client-side
  let compressed: File;
  try {
    compressed = await imageCompression(file, {
      maxSizeMB: IMAGE_CONSTRAINTS.avatar.maxSizeMB,
      maxWidthOrHeight: IMAGE_CONSTRAINTS.avatar.maxWidthOrHeight,
      useWebWorker: true,
    });
  } catch (error) {
    throw new Error(
      `Failed to compress ID document: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const publicUrl = await invokeUpload(compressed, STORAGE_BUCKETS.avatars, userId);
  return publicUrl;
}
