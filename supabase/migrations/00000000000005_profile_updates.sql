-- Profile updates: add role, verification, and identity columns.
-- These columns support the driver/rider distinction and ID verification flow.

-- Add user_role column with constrained values
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'rider'
  CHECK (user_role IN ('rider', 'driver', 'both'));

-- Add identity verification columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_document_url TEXT;

-- Function to check phone verification status from auth.users.
-- Derives from auth.users.phone_confirmed_at rather than storing a separate column
-- to avoid stale data (per research pitfall #4).
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
