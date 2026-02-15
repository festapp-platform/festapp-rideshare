-- Storage buckets for user avatars and vehicle photos.
-- Both buckets are public (anyone can view), but uploads are restricted
-- to authenticated users writing only within their own user-ID folder.

-- Create avatars bucket (2MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create vehicles bucket (5MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicles',
  'vehicles',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS policies for avatars bucket
-- Users can upload to their own folder: avatars/{user_id}/...
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- RLS policies for vehicles bucket
-- Users can upload to their own folder: vehicles/{user_id}/...
CREATE POLICY "Users can upload their own vehicle photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicles'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "Users can update their own vehicle photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'vehicles'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "Users can delete their own vehicle photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vehicles'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
