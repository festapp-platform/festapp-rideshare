-- Short IDs for rides and profiles: clean, unambiguous shareable URLs
-- Character set excludes 0, 1, i, l, o to avoid visual confusion

-- Add short_id columns
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS short_id VARCHAR(8) UNIQUE DEFAULT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS short_id VARCHAR(8) UNIQUE DEFAULT NULL;

-- Function to generate a random 6-char alphanumeric short ID
-- Uses unambiguous character set: abcdefghjkmnpqrstuvwxyz23456789
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

-- Trigger: auto-set short_id on new rides
CREATE OR REPLACE FUNCTION public.set_ride_short_id()
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

CREATE TRIGGER set_ride_short_id
  BEFORE INSERT ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.set_ride_short_id();

-- Trigger: auto-set short_id on new profiles
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

-- Backfill existing rows
UPDATE public.rides SET short_id = public.generate_short_id() WHERE short_id IS NULL;
UPDATE public.profiles SET short_id = public.generate_short_id() WHERE short_id IS NULL;

-- After backfill, make NOT NULL
ALTER TABLE public.rides ALTER COLUMN short_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN short_id SET NOT NULL;
