# Phase 2: Profiles & Identity - Research

**Researched:** 2026-02-15
**Domain:** User profiles, image upload/optimization, Supabase Storage, verification badges
**Confidence:** HIGH

## Summary

Phase 2 builds on the existing `profiles` table (already has `display_name`, `avatar_url`, `bio`, `social_links`, `rating_avg`, `rating_count`) and adds vehicle management, verification badges, image upload pipelines, and an extended onboarding flow. The database schema is partially ready -- profiles already auto-create on signup via trigger. The main technical work involves: (1) a new `vehicles` table, (2) Supabase Storage buckets with RLS for avatars and car photos, (3) client-side image compression before upload, (4) verification status columns, (5) profile editing UI on both web and mobile, and (6) extending onboarding to include profile creation and role selection steps.

The existing codebase already has react-hook-form + Zod on both platforms, Supabase client helpers (browser and server), and placeholder profile/onboarding screens ready to be replaced. The onboarding flow currently only handles permissions (location, notifications) and needs new steps for profile creation (ONBR-02), role selection (ONBR-03), and optional vehicle setup (ONBR-04).

**Primary recommendation:** Use client-side image compression (browser-image-compression for web, expo-image-manipulator for mobile) before uploading to Supabase Storage public buckets with user-scoped RLS policies. Avoid Supabase Storage Image Transformations (requires Pro plan) -- compress and resize on the client instead.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.95.3 | Database queries, storage uploads | Already in use for auth |
| @supabase/ssr | ^0.8.0 | Server-side Supabase in Next.js | Already in use for auth |
| react-hook-form | ^7.71.1 | Form state management | Already in both apps |
| @hookform/resolvers | ^5.2.2 | Zod resolver for RHF | Already in both apps |
| zod | 3.25.x | Schema validation | Already in shared package |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| browser-image-compression | ^2.0.2 | Client-side image resize/compress (web) | Before avatar/car photo upload on web |
| expo-image-picker | ~16.0.x (SDK 54) | Select photos from library or camera (mobile) | Avatar and car photo selection on mobile |
| expo-image-manipulator | ~14.0.x (SDK 54) | Resize/compress images (mobile) | Before upload on mobile |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| browser-image-compression | Canvas API directly | browser-image-compression handles web worker offloading, EXIF orientation, quality control; hand-rolling is error-prone |
| expo-image-manipulator | expo-image-picker quality option | quality option alone doesn't resize; manipulator gives explicit width/height control |
| Client-side compression | Supabase Storage Image Transformations | Transformations require Pro plan; client-side is free and reduces upload bandwidth |
| Client-side compression | Edge Function with magick-wasm | Adds cold-start latency, WASM complexity; client-side is simpler for this use case |

**Installation:**
```bash
# Web app
cd apps/web && npm install browser-image-compression

# Mobile app
cd apps/mobile && npx expo install expo-image-picker expo-image-manipulator
```

## Architecture Patterns

### Recommended Project Structure
```
packages/shared/src/
├── validation/
│   ├── auth.ts              # Existing
│   └── profile.ts           # NEW: profile + vehicle Zod schemas
├── constants/
│   ├── onboarding.ts        # EXTEND: add profile/role/vehicle steps
│   └── storage.ts           # NEW: bucket names, size limits, paths
├── types/
│   └── database.ts          # EXTEND: add vehicles table types

apps/web/app/(app)/
├── profile/
│   ├── page.tsx             # REPLACE: profile view + edit
│   └── [id]/page.tsx        # NEW: view other user's profile
├── onboarding/
│   └── page.tsx             # EXTEND: add profile + role + vehicle steps

apps/mobile/app/
├── (tabs)/profile/
│   └── index.tsx            # REPLACE: profile view + edit
├── profile/
│   └── [id].tsx             # NEW: view other user's profile
├── onboarding.tsx           # EXTEND: add profile + role + vehicle steps

supabase/
├── migrations/
│   ├── 00000000000003_vehicles.sql        # NEW: vehicles table
│   ├── 00000000000004_storage_buckets.sql # NEW: avatars + vehicles buckets
│   └── 00000000000005_profile_updates.sql # NEW: verification columns
```

### Pattern 1: Image Upload Flow (Web)
**What:** Client compresses image, uploads to Supabase Storage, saves URL to profile
**When to use:** Avatar upload, car photo upload on web

```typescript
// Source: Supabase Storage docs + browser-image-compression docs
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';

async function uploadAvatar(file: File, userId: string) {
  // 1. Compress client-side
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 800,
    useWebWorker: true,
  });

  // 2. Upload to Supabase Storage
  const supabase = createClient();
  const path = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, compressed, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '3600',
    });
  if (uploadError) throw uploadError;

  // 3. Get public URL and update profile
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);
  if (updateError) throw updateError;

  return publicUrl;
}
```

### Pattern 2: Image Upload Flow (Mobile)
**What:** Pick image, resize, upload to Supabase Storage
**When to use:** Avatar upload, car photo upload on mobile

```typescript
// Source: expo-image-picker + expo-image-manipulator docs
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

async function pickAndUploadAvatar(userId: string) {
  // 1. Pick image with built-in crop
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;

  // 2. Resize to max dimensions
  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 800 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  // 3. Upload to Supabase Storage
  const response = await fetch(manipulated.uri);
  const blob = await response.blob();
  const path = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (error) throw error;
  // ... update profile with public URL
}
```

### Pattern 3: Storage Bucket Creation (Migration)
**What:** Create storage buckets via SQL migration and define RLS policies
**When to use:** Setting up avatars and vehicles buckets

```sql
-- Source: Supabase Storage docs (creating-buckets, access-control)

-- Create public bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Create public bucket for vehicle photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('vehicles', 'vehicles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- RLS: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- RLS: Anyone can view avatars (public bucket, but policy still needed for non-SELECT ops)
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- RLS: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (select auth.uid()::text)
);
```

### Pattern 4: Vehicles Table Schema
**What:** Database table for driver vehicle information
**When to use:** PROF-07, PROF-08, PROF-09

```sql
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  photo_url TEXT,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Auto-update timestamp
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Any authenticated user can view vehicles (for ride details)
CREATE POLICY "Anyone can view vehicles"
  ON public.vehicles FOR SELECT TO authenticated
  USING (true);

-- Owners can manage their vehicles
CREATE POLICY "Owners can insert vehicles"
  ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update vehicles"
  ON public.vehicles FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete vehicles"
  ON public.vehicles FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
```

### Pattern 5: Profile Verification Columns
**What:** Add verification status and role to profiles table
**When to use:** PROF-04, PROF-10, ONBR-03

```sql
-- Add to profiles table via ALTER
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'rider'
    CHECK (user_role IN ('rider', 'driver', 'both'));
```

Note: The existing profiles migration already has a `phone` column. The `phone_verified` status should be derived from whether `auth.users.phone_confirmed_at` is set. This can be handled via a database function or checked at query time by joining auth.users.

### Anti-Patterns to Avoid
- **Storing full-size images:** Always compress client-side before upload. A 10MB phone photo becomes a 200KB-500KB JPEG at 800px wide.
- **Using Edge Functions for basic image resize:** Adds cold-start latency and WASM complexity when client-side compression is simpler and free.
- **Storing image data in the database:** Use Supabase Storage for files, store only the URL in the profiles/vehicles table.
- **Hardcoding bucket paths:** Use shared constants for bucket names and path patterns.
- **Skipping upsert for avatars:** Users will re-upload avatars; always use `upsert: true` to overwrite.
- **Creating separate profile-edit page:** Profile view and edit should be the same screen with an edit toggle/modal for simplicity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image compression (web) | Canvas API resize | browser-image-compression | Handles EXIF rotation, web workers, quality control, edge cases |
| Image compression (mobile) | Manual pixel manipulation | expo-image-manipulator | Native-backed, handles formats, fast |
| Image picking (mobile) | Custom camera/gallery UI | expo-image-picker | System UI, permissions, crop built-in |
| File upload to cloud | Custom S3 integration | Supabase Storage SDK | RLS policies, CDN, integrated with auth |
| Form state + validation | Manual state + onChange | react-hook-form + Zod | Already in project, handles complex forms |
| Phone verification check | Custom verification flow | Read from auth.users phone_confirmed_at | Supabase auth already tracks this |

**Key insight:** The image pipeline is the most complex part of this phase. Client-side compression eliminates the need for server-side processing, and Supabase Storage with public buckets eliminates signed URL management.

## Common Pitfalls

### Pitfall 1: EXIF Orientation on Mobile Photos
**What goes wrong:** Photos from phone cameras include EXIF orientation metadata. If not handled, images appear rotated 90 degrees after upload.
**Why it happens:** Camera sensors capture in landscape; orientation is stored as metadata, not pixel rotation.
**How to avoid:** browser-image-compression auto-corrects EXIF orientation. expo-image-manipulator also handles this. Do not use raw Canvas resize without EXIF correction.
**Warning signs:** Uploaded photos appear sideways or upside-down.

### Pitfall 2: Supabase Storage RLS Policy Gaps
**What goes wrong:** Users can overwrite other users' avatars, or uploads silently fail with 403.
**Why it happens:** Storage RLS requires explicit INSERT, UPDATE, and SELECT policies. Missing any one causes confusing failures. The folder path must match `auth.uid()::text`.
**How to avoid:** Always test upload + overwrite + delete for own files AND verify rejection for other users' files. Use the `(storage.foldername(name))[1] = auth.uid()::text` pattern consistently.
**Warning signs:** 403 errors on upload, or ability to modify other users' photos.

### Pitfall 3: CDN Cache After Avatar Update
**What goes wrong:** User updates avatar but sees the old image because the URL hasn't changed and CDN serves cached version.
**Why it happens:** Public bucket URLs are aggressively cached. Same path = same URL = cached response.
**How to avoid:** Append a cache-busting query parameter (e.g., `?t=${Date.now()}`) to the stored avatar_url, or use a unique filename per upload (e.g., `{userId}/avatar-{timestamp}.jpg`). The timestamp approach is cleaner.
**Warning signs:** Profile shows old avatar after successful upload.

### Pitfall 4: Missing Phone Verification Derivation
**What goes wrong:** Phone verification badge logic is implemented as a separate manual flag, desynchronizing from actual auth state.
**Why it happens:** The profiles table has a `phone` column but verification comes from `auth.users.phone_confirmed_at`.
**How to avoid:** Derive phone_verified status from `auth.users` at query time, or use a Supabase trigger/function that updates a `phone_verified` column when `auth.users` changes. A database function is simpler than client-side joins.
**Warning signs:** Badge shows verified but phone isn't actually confirmed, or vice versa.

### Pitfall 5: Onboarding Step Regression
**What goes wrong:** Adding new onboarding steps (profile, role, vehicle) breaks the existing permission-request flow or the completed-key check.
**Why it happens:** Current onboarding uses `ONBOARDING_COMPLETED_KEY` in localStorage/AsyncStorage as a simple boolean. New steps need to integrate without breaking existing users who already completed onboarding.
**How to avoid:** Check if user has a profile (display_name != 'User' and avatar_url is set) to determine if profile onboarding is needed, separate from the permissions onboarding. Consider a `profile_completed` flag in the profiles table or a versioned onboarding key.
**Warning signs:** Existing users see onboarding again, or new users skip profile creation.

### Pitfall 6: Large File Upload on Slow Connection
**What goes wrong:** Upload appears to hang, user navigates away, upload fails silently.
**Why it happens:** Even after compression, a 500KB image on a slow 3G connection takes several seconds. No progress indicator = confused user.
**How to avoid:** Show upload progress indicator. Supabase standard upload doesn't provide progress events, but the file is small enough post-compression (<500KB) that a spinner suffices. For larger car photos, consider TUS resumable upload if issues arise.
**Warning signs:** Users report "nothing happens" when uploading photos.

## Code Examples

### Zod Validation Schemas for Profile and Vehicle

```typescript
// packages/shared/src/validation/profile.ts
import { z } from 'zod';

export const DisplayNameSchema = z.string().min(1, 'Name is required').max(50);

export const BioSchema = z.string().max(300, 'Bio must be under 300 characters').optional();

export const SocialLinksSchema = z.object({
  instagram: z.string().url().optional().or(z.literal('')),
  facebook: z.string().url().optional().or(z.literal('')),
});

export const UserRoleSchema = z.enum(['rider', 'driver', 'both']);

export const ProfileUpdateSchema = z.object({
  display_name: DisplayNameSchema,
  bio: BioSchema,
  social_links: SocialLinksSchema.optional(),
});

export const VehicleSchema = z.object({
  make: z.string().min(1, 'Make is required').max(50),
  model: z.string().min(1, 'Model is required').max(50),
  color: z.string().min(1, 'Color is required').max(30),
  license_plate: z.string().min(1, 'License plate is required').max(20),
});
```

### Profile Edit Form (Web Pattern)

```typescript
// Pattern for profile edit with react-hook-form
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProfileUpdateSchema } from '@festapp/shared';

function ProfileEditForm({ profile }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(ProfileUpdateSchema),
    defaultValues: {
      display_name: profile.display_name,
      bio: profile.bio ?? '',
      social_links: profile.social_links ?? {},
    },
  });

  const onSubmit = async (data) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', profile.id);
    // handle error/success
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* form fields */}
    </form>
  );
}
```

### Image Preview with File Input (Web)

```typescript
// Pattern: file input with preview using URL.createObjectURL
const [previewUrl, setPreviewUrl] = useState<string | null>(null);

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    // Revoke previous preview URL to avoid memory leak
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }
};
```

### Deriving Phone Verification Status

```sql
-- Database function to check phone verification
CREATE OR REPLACE FUNCTION public.is_phone_verified(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
STABLE
AS $$
  SELECT phone_confirmed_at IS NOT NULL
  FROM auth.users
  WHERE id = user_id;
$$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side image resize (Sharp/ImageMagick) | Client-side compression before upload | 2023+ | Eliminates server processing cost, reduces upload bandwidth |
| Signed URLs for all images | Public buckets for profile photos | Supabase Storage v2 | Simpler URLs, better CDN caching for public-facing images |
| expo-image-picker quality-only | expo-image-manipulator for explicit resize | Expo SDK 50+ | Precise control over output dimensions |
| Separate profile view/edit pages | Inline edit toggle on profile page | Modern UX pattern | Fewer page transitions, faster editing |
| Manual file type validation | Bucket-level allowed_mime_types | Supabase Storage update | Server enforces file types, client validates for UX |

**Deprecated/outdated:**
- Supabase Storage v1 API (replaced by v2 with RLS on storage.objects)
- `expo-image-picker` `MediaTypeOptions` enum (replaced with string array `['images']` in SDK 54)

## Open Questions

1. **Supabase Plan Level**
   - What we know: Storage Image Transformations (server-side resize on URL fetch) require Pro plan
   - What's unclear: Whether the project is on Free or Pro plan
   - Recommendation: Use client-side compression regardless -- it's more efficient and works on all plans. If Pro plan is available, image transformations can be added later as an optimization for serving different sizes.

2. **ID Document Upload (PROF-10)**
   - What we know: Users can upload driver's license or ID for enhanced verification
   - What's unclear: Is there a manual review process? Auto-verification via OCR? Or is upload alone sufficient for the badge?
   - Recommendation: For Phase 2, implement upload-only with a simple `id_verified` flag. Store the document in a PRIVATE bucket (not public). Manual review or automated verification can be added in a later phase. The id_document_url should not be publicly accessible.

3. **Social Links Verification**
   - What we know: PROF-03 says users link Instagram and Facebook profiles
   - What's unclear: Are these just stored URLs, or is OAuth connection required?
   - Recommendation: Store as URLs (simplest). OAuth-based social linking is a much larger scope and not described in the requirements.

4. **Ratings Placeholder (PROF-05)**
   - What we know: Profile shows ratings but rating_avg/rating_count already exist in the schema
   - What's unclear: Rating system is likely a later phase
   - Recommendation: Show ratings section on profile with "No ratings yet" placeholder. The columns exist; the rating collection mechanism comes later.

5. **Onboarding Version Migration**
   - What we know: Existing users have `onboarding_completed = true` in localStorage/AsyncStorage
   - What's unclear: Should existing users see the new profile-creation steps?
   - Recommendation: Use a separate key (e.g., `profile_onboarding_completed`) or check profile completeness server-side. Existing users with incomplete profiles should be prompted.

## Sources

### Primary (HIGH confidence)
- Supabase Storage docs: [Standard Uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [Access Control](https://supabase.com/docs/guides/storage/security/access-control), [Creating Buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets), [Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations), [Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions)
- Expo docs: [ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [ImageManipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)
- Supabase Edge Functions: [Image Manipulation](https://supabase.com/docs/guides/functions/examples/image-manipulation) (magick-wasm pattern, used as reference for why we chose client-side instead)
- Existing codebase: profiles migration, RLS policies, onboarding flow, Supabase client helpers

### Secondary (MEDIUM confidence)
- [browser-image-compression npm](https://www.npmjs.com/package/browser-image-compression) - Well-maintained, 2M+ weekly downloads
- [React Hook Form file upload patterns](https://claritydev.net/blog/react-hook-form-multipart-form-data-file-uploads)

### Tertiary (LOW confidence)
- None -- all findings verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are either already installed or well-documented Expo/Supabase ecosystem tools
- Architecture: HIGH - Patterns verified against Supabase Storage official docs and existing codebase conventions
- Pitfalls: HIGH - Based on known Supabase Storage behaviors documented officially (CDN caching, RLS policy requirements)
- Image pipeline: MEDIUM - Client-side compression approach is well-established but specific library versions for Expo SDK 54 should be verified at install time

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days -- stable domain, no fast-moving changes expected)
