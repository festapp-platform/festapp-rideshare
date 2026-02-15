---
created: 2026-02-15T20:05:00.000Z
title: Fix image uploads via Edge Function
area: api
files:
  - supabase/functions/upload-image/index.ts
  - apps/web/lib/supabase/storage.ts
  - apps/web/app/(app)/profile/page.tsx
  - apps/mobile/lib/image-upload.ts
  - packages/shared/src/constants/storage.ts
  - supabase/migrations/00000000000004_storage_buckets.sql
---

## Problem

Avatar upload fails with "new row violates row-level security policy". Current code uploads directly from client to Supabase Storage using RLS policies that check `(storage.foldername(name))[1] = auth.uid()`. This is fragile and currently broken.

The akhweb project uses a proven pattern: single Edge Function with `service_role` handles all uploads server-side, random UUID filenames, no RLS dependency for writes.

## Solution

Refactor to match akhweb pattern:

1. **New Edge Function `upload-image`**: accepts FormData (file, bucket, folder), validates JWT, generates `crypto.randomUUID().ext` filename, uploads via `service_role` (bypasses RLS), returns `{ publicUrl }`

2. **Update web uploads** (`apps/web/lib/supabase/storage.ts`): keep client-side compression (`browser-image-compression`), POST to Edge Function instead of `storage.from().upload()`

3. **Update profile page** (`apps/web/app/(app)/profile/page.tsx`): route ID document upload through same Edge Function

4. **Update mobile uploads** (`apps/mobile/lib/image-upload.ts`): same pattern, call via `supabase.functions.invoke`

5. **Clean up constants** (`packages/shared/src/constants/storage.ts`): remove `getAvatarPath()` and `getVehiclePhotoPath()` — random names generated server-side now

6. **Deploy**: `supabase functions deploy upload-image` — no new secrets needed (uses existing `SUPABASE_SERVICE_ROLE_KEY`)
