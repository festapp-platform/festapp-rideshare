/**
 * Web image compression and Supabase Storage upload helpers.
 *
 * Compresses images client-side with browser-image-compression before
 * uploading to Supabase Storage buckets. Used for avatar and vehicle photos.
 */
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import {
  STORAGE_BUCKETS,
  IMAGE_CONSTRAINTS,
  getAvatarPath,
  getVehiclePhotoPath,
} from "@festapp/shared";

/**
 * Compress and upload an avatar image to Supabase Storage.
 * Updates the user's profile avatar_url with the new public URL.
 *
 * @param file - The image file to upload
 * @param userId - The authenticated user's ID
 * @returns The public URL of the uploaded avatar
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

  // Upload to storage
  const path = getAvatarPath(userId);
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.avatars)
    .upload(path, compressed, {
      upsert: true,
      contentType: "image/jpeg",
    });

  if (uploadError) {
    throw new Error(`Failed to upload avatar: ${uploadError.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKETS.avatars).getPublicUrl(path);

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
 * Compress and upload a vehicle photo to Supabase Storage.
 *
 * @param file - The image file to upload
 * @param userId - The authenticated user's ID
 * @param vehicleId - The vehicle's ID
 * @returns The public URL of the uploaded vehicle photo
 */
export async function uploadVehiclePhoto(
  file: File,
  userId: string,
  vehicleId: string,
): Promise<string> {
  const supabase = createClient();

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

  // Upload to storage
  const path = getVehiclePhotoPath(userId, vehicleId);
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.vehicles)
    .upload(path, compressed, {
      upsert: true,
      contentType: "image/jpeg",
    });

  if (uploadError) {
    throw new Error(`Failed to upload vehicle photo: ${uploadError.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKETS.vehicles).getPublicUrl(path);

  return publicUrl;
}
