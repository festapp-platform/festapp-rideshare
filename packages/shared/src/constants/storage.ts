/**
 * Storage bucket names, image constraints, and path helpers.
 *
 * Bucket names match the Supabase storage buckets created in migration 00000000000004.
 * Path helpers use timestamp suffixes for cache-busting (per research pitfall #3).
 */

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  vehicles: 'vehicles',
} as const;

export const IMAGE_CONSTRAINTS = {
  avatar: { maxSizeMB: 0.5, maxWidthOrHeight: 800 },
  vehicle: { maxSizeMB: 1, maxWidthOrHeight: 1200 },
} as const;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Returns the storage path for a user's avatar. Timestamp suffix busts CDN cache. */
export function getAvatarPath(userId: string): string {
  return `${userId}/avatar-${Date.now()}.jpg`;
}

/** Returns the storage path for a vehicle photo. Timestamp suffix busts CDN cache. */
export function getVehiclePhotoPath(
  userId: string,
  vehicleId: string
): string {
  return `${userId}/${vehicleId}-${Date.now()}.jpg`;
}
