-- Vehicles table: stores vehicle information for drivers.
-- Each vehicle belongs to a profile (owner). A user can have multiple vehicles
-- but typically one is marked as primary.

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

-- Enable Row Level Security
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on vehicle changes
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- Any authenticated user can view any vehicle (needed for ride listings)
CREATE POLICY "Users can view any vehicle"
  ON public.vehicles FOR SELECT TO authenticated
  USING (true);

-- Only the owner can insert their own vehicles
CREATE POLICY "Users can insert their own vehicles"
  ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Only the owner can update their own vehicles
CREATE POLICY "Users can update their own vehicles"
  ON public.vehicles FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Only the owner can delete their own vehicles
CREATE POLICY "Users can delete their own vehicles"
  ON public.vehicles FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
