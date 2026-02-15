/**
 * Mobile image picking, compression, and upload helpers.
 *
 * Uses expo-image-picker for selection and expo-image-manipulator for
 * client-side resizing before uploading to Supabase Storage.
 */
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import {
  STORAGE_BUCKETS,
  IMAGE_CONSTRAINTS,
  getAvatarPath,
  getVehiclePhotoPath,
} from "@festapp/shared";

/**
 * Request media library permissions. Shows alert if denied.
 * @returns true if permission granted
 */
async function requestPermission(): Promise<boolean> {
  const { status } =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== "granted") {
    Alert.alert(
      "Permission Required",
      "Please allow access to your photo library to upload images.",
    );
    return false;
  }

  return true;
}

/**
 * Pick an image from the library, resize it, and upload as avatar.
 * Updates the user's profile avatar_url with the new public URL.
 *
 * @param userId - The authenticated user's ID
 * @returns The public URL of the uploaded avatar, or null if cancelled
 */
export async function pickAndUploadAvatar(
  userId: string,
): Promise<string | null> {
  const hasPermission = await requestPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];

  // Resize and compress with ImageManipulator
  const manipulated = await manipulateAsync(
    asset.uri,
    [{ resize: { width: IMAGE_CONSTRAINTS.avatar.maxWidthOrHeight } }],
    { compress: 0.7, format: SaveFormat.JPEG },
  );

  // Convert to blob for upload
  const response = await fetch(manipulated.uri);
  const blob = await response.blob();

  // Upload to storage
  const path = getAvatarPath(userId);
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.avatars)
    .upload(path, blob, {
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
 * Pick an image from the library, resize it, and upload as vehicle photo.
 *
 * @param userId - The authenticated user's ID
 * @param vehicleId - The vehicle's ID
 * @returns The public URL of the uploaded vehicle photo, or null if cancelled
 */
export async function pickAndUploadVehiclePhoto(
  userId: string,
  vehicleId: string,
): Promise<string | null> {
  const hasPermission = await requestPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];

  // Resize and compress with ImageManipulator
  const manipulated = await manipulateAsync(
    asset.uri,
    [{ resize: { width: IMAGE_CONSTRAINTS.vehicle.maxWidthOrHeight } }],
    { compress: 0.7, format: SaveFormat.JPEG },
  );

  // Convert to blob for upload
  const response = await fetch(manipulated.uri);
  const blob = await response.blob();

  // Upload to storage
  const path = getVehiclePhotoPath(userId, vehicleId);
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.vehicles)
    .upload(path, blob, {
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
