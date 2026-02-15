-- Recurring ride patterns: templates for auto-generating weekly rides
CREATE TABLE public.recurring_ride_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id),
  origin_location GEOGRAPHY(POINT, 4326) NOT NULL,
  origin_address TEXT NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_address TEXT NOT NULL,
  route_geometry GEOGRAPHY(LINESTRING, 4326),
  route_encoded_polyline TEXT,

  -- Recurrence pattern
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  departure_time TIME NOT NULL,
  seats_total INT NOT NULL DEFAULT 4,
  price_czk NUMERIC(10,2),
  booking_mode TEXT DEFAULT 'request' CHECK (booking_mode IN ('instant', 'request')),

  -- Control
  is_active BOOLEAN DEFAULT true,
  generate_weeks_ahead INT DEFAULT 2,
  last_generated_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from rides to recurring_ride_patterns
ALTER TABLE public.rides
  ADD CONSTRAINT fk_rides_recurring_pattern
  FOREIGN KEY (recurring_pattern_id) REFERENCES public.recurring_ride_patterns(id);

-- Auto-update updated_at
CREATE TRIGGER update_recurring_ride_patterns_updated_at
  BEFORE UPDATE ON public.recurring_ride_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Lookup active patterns by driver
CREATE INDEX idx_recurring_patterns_driver_active
  ON public.recurring_ride_patterns (driver_id, is_active);
