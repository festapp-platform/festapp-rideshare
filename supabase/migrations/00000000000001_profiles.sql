-- ============================================================
-- Profiles, Vehicles, Storage, Notification Preferences
-- Squashed from: 00000000000001_profiles, 00000000000002_rls_policies,
--   00000000000003_vehicles, 00000000000004_storage_buckets,
--   00000000000005_profile_updates, 00000000000023_notification_preferences,
--   00000000000029_reviews (profile columns only), 042_short_ids (profile parts)
-- ============================================================

-- ============================================================
-- 1. generate_short_id() utility function
-- ============================================================

-- Generates a random 6-char alphanumeric ID using an unambiguous character set
-- (excludes 0, 1, i, l, o to avoid visual confusion)
CREATE OR REPLACE FUNCTION public.generate_short_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'abcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============================================================
-- 2. Profiles table
-- ============================================================

CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          TEXT NOT NULL DEFAULT 'User',
  avatar_url            TEXT,
  phone                 TEXT,
  bio                   TEXT,
  social_links          JSONB DEFAULT '{}',

  -- Role & verification
  user_role             TEXT DEFAULT 'rider' CHECK (user_role IN ('rider', 'driver', 'both')),
  id_verified           BOOLEAN DEFAULT false,
  id_document_url       TEXT,

  -- Ratings & trust (maintained by review triggers)
  rating_avg            NUMERIC(3,2) DEFAULT 0,
  rating_count          INT DEFAULT 0,
  completed_rides_count INT DEFAULT 0,

  -- Account status (for moderation / trust & safety)
  account_status        TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned')),
  suspended_until       TIMESTAMPTZ,

  -- Shareable short ID
  short_id              VARCHAR(8) UNIQUE NOT NULL DEFAULT public.generate_short_id(),

  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on profile changes
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-set short_id on new profiles (ensures short_id even if DEFAULT is bypassed)
CREATE OR REPLACE FUNCTION public.set_profile_short_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := public.generate_short_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profile_short_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_short_id();

-- ============================================================
-- 3. handle_new_user auth trigger
-- ============================================================

-- Auto-create profile row when a new user signs up.
-- CRITICAL: SECURITY DEFINER SET search_path = '' is required because the trigger
-- runs as supabase_auth_admin which cannot access the public schema without it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'User'),
    NEW.phone
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. is_phone_verified() helper function
-- ============================================================

-- Derives verification status from auth.users.phone_confirmed_at
-- rather than storing a separate column to avoid stale data.
CREATE OR REPLACE FUNCTION public.is_phone_verified(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND phone_confirmed_at IS NOT NULL
  );
END;
$$;

-- ============================================================
-- 5. Profile RLS policies
-- ============================================================

-- Any authenticated user can view any profile (needed for driver/passenger info)
CREATE POLICY "Users can view any profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No INSERT policy: on_auth_user_created trigger handles profile creation.
-- No DELETE policy: CASCADE from auth.users handles profile deletion.

-- ============================================================
-- 6. Vehicles table
-- ============================================================

CREATE TABLE public.vehicles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  make          TEXT NOT NULL,
  model         TEXT NOT NULL,
  color         TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  photo_url     TEXT,
  is_primary    BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Any authenticated user can view any vehicle (needed for ride listings)
CREATE POLICY "Users can view any vehicle"
  ON public.vehicles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own vehicles"
  ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own vehicles"
  ON public.vehicles FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own vehicles"
  ON public.vehicles FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- 7. Storage buckets (avatars & vehicle photos)
-- ============================================================

-- Avatars bucket (2 MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Vehicles bucket (5 MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicles', 'vehicles', true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Avatars bucket RLS: users upload/update/delete within their own folder
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

-- Vehicles bucket RLS: users upload/update/delete within their own folder
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

-- ============================================================
-- 8. Notification preferences table
-- ============================================================

CREATE TABLE public.notification_preferences (
  user_id                    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_booking_requests      BOOLEAN NOT NULL DEFAULT true,
  push_booking_confirmations BOOLEAN NOT NULL DEFAULT true,
  push_booking_cancellations BOOLEAN NOT NULL DEFAULT true,
  push_new_messages          BOOLEAN NOT NULL DEFAULT true,
  push_ride_reminders        BOOLEAN NOT NULL DEFAULT true,
  push_route_alerts          BOOLEAN NOT NULL DEFAULT true,
  email_booking_confirmations BOOLEAN NOT NULL DEFAULT true,
  email_ride_reminders       BOOLEAN NOT NULL DEFAULT true,
  email_cancellations        BOOLEAN NOT NULL DEFAULT true,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
