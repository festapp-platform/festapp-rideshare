/**
 * Storage bucket names and image constraints.
 *
 * Bucket names match the Supabase storage buckets created in migration 00000000000004.
 * Filenames are generated server-side (random UUID) by the upload-image Edge Function.
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
