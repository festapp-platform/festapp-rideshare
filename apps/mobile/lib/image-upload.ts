/**
 * Mobile image picking, compression, and upload helpers.
 *
 * Uses expo-image-picker for selection and expo-image-manipulator for
 * client-side resizing. Uploads via the upload-image Edge Function
 * (service_role, random UUID filenames).
 */
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { STORAGE_BUCKETS, IMAGE_CONSTRAINTS } from "@festapp/shared";

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
 * Upload a blob via the upload-image Edge Function.
 * Returns the public URL of the uploaded file.
 */
async function invokeUpload(
  blob: Blob,
  bucket: string,
  folder?: string,
  fileName?: string,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", {
    uri: URL.createObjectURL(blob),
    type: "image/jpeg",
    name: fileName || "image.jpg",
  } as unknown as Blob);
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
 * Pick an image from the library, resize it, and upload as avatar.
 * Updates the user's profile avatar_url with the new public URL.
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

  // Upload via Edge Function
  const publicUrl = await invokeUpload(blob, STORAGE_BUCKETS.avatars, userId, "avatar.jpg");

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

  // Upload via Edge Function
  const publicUrl = await invokeUpload(blob, STORAGE_BUCKETS.vehicles, userId, "vehicle.jpg");

  return publicUrl;
}
