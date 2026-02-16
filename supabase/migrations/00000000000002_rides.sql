-- Squashed rides migration: rides, waypoints, recurring patterns, favorite routes
-- Sources: 007, 008, 009, 010, 011, 013, 020 (cancel cols), 021 (drop luggage),
--          023 (alert_enabled), 026 (reminder_sent_at), 033 (event_id), 042 (short_id)

-- ============================================================
-- 1. Rides table (final schema — luggage_size excluded)
-- ============================================================
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id),
  vehicle_id UUID REFERENCES public.vehicles(id),

  -- Origin/Destination as Points
  origin_location GEOGRAPHY(POINT, 4326) NOT NULL,
  origin_address TEXT NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_address TEXT NOT NULL,

  -- Route as LineString (computed from Google Routes API)
  route_geometry GEOGRAPHY(LINESTRING, 4326),
  route_encoded_polyline TEXT,

  -- Ride details
  departure_time TIMESTAMPTZ NOT NULL,
  seats_total INT NOT NULL CHECK (seats_total BETWEEN 1 AND 8),
  seats_available INT NOT NULL CHECK (seats_available BETWEEN 0 AND 8),
  suggested_price_czk NUMERIC(10,2),
  price_czk NUMERIC(10,2),
  distance_meters INT,
  duration_seconds INT,
  booking_mode TEXT DEFAULT 'request' CHECK (booking_mode IN ('instant', 'request')),
  preferences JSONB DEFAULT '{}',
  notes TEXT,

  -- Status management
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),

  -- Cancellation metadata (from migration 20)
  cancelled_by UUID REFERENCES public.profiles(id),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,

  -- Recurring ride link (FK added after patterns table creation)
  recurring_pattern_id UUID,

  -- Event link (FK added in 009_community.sql after events table exists)
  event_id UUID,

  -- Short ID for shareable URLs (from migration 042)
  short_id VARCHAR(8) NOT NULL UNIQUE,

  -- Reminder tracking (from migration 26)
  reminder_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Indexes
-- ============================================================

-- GIST spatial indexes for performant geospatial queries
CREATE INDEX idx_rides_origin_geo ON public.rides USING GIST (origin_location);
CREATE INDEX idx_rides_destination_geo ON public.rides USING GIST (destination_location);
CREATE INDEX idx_rides_route_geo ON public.rides USING GIST (route_geometry);

-- Composite index for active ride search (status + departure time)
CREATE INDEX idx_rides_active_departure ON public.rides (departure_time)
  WHERE status = 'upcoming';

-- Driver's rides lookup
CREATE INDEX idx_rides_driver ON public.rides (driver_id, departure_time DESC);

-- Event rides lookup
CREATE INDEX idx_rides_event_id ON public.rides (event_id) WHERE event_id IS NOT NULL;

-- ============================================================
-- 3. Short ID generation (from migration 042)
-- ============================================================

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

-- ============================================================
-- 4. updated_at trigger
-- ============================================================
CREATE TRIGGER update_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. Ride waypoints table
-- ============================================================
CREATE TABLE public.ride_waypoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address TEXT NOT NULL,
  order_index INT NOT NULL,
  type TEXT DEFAULT 'pickup' CHECK (type IN ('pickup', 'dropoff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ride_waypoints_location ON public.ride_waypoints USING GIST (location);
CREATE INDEX idx_ride_waypoints_ride_order ON public.ride_waypoints (ride_id, order_index);

-- ============================================================
-- 6. Recurring ride patterns table
-- ============================================================
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

CREATE TRIGGER update_recurring_ride_patterns_updated_at
  BEFORE UPDATE ON public.recurring_ride_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_recurring_patterns_driver_active
  ON public.recurring_ride_patterns (driver_id, is_active);

-- ============================================================
-- 7. Favorite routes table (with alert_enabled from migration 23)
-- ============================================================
CREATE TABLE public.favorite_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin_location GEOGRAPHY(POINT, 4326) NOT NULL,
  origin_address TEXT NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_address TEXT NOT NULL,
  label TEXT,
  alert_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, origin_address, destination_address)
);

-- ============================================================
-- 8. RLS policies
-- ============================================================

-- rides
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all rides"
  ON public.rides FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Drivers can insert their own rides"
  ON public.rides FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own rides"
  ON public.rides FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can delete their own rides"
  ON public.rides FOR DELETE TO authenticated
  USING (driver_id = auth.uid());

-- ride_waypoints
ALTER TABLE public.ride_waypoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all waypoints"
  ON public.ride_waypoints FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Ride driver can insert waypoints"
  ON public.ride_waypoints FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rides
      WHERE rides.id = ride_id AND rides.driver_id = auth.uid()
    )
  );

CREATE POLICY "Ride driver can update waypoints"
  ON public.ride_waypoints FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides
      WHERE rides.id = ride_id AND rides.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rides
      WHERE rides.id = ride_id AND rides.driver_id = auth.uid()
    )
  );

CREATE POLICY "Ride driver can delete waypoints"
  ON public.ride_waypoints FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides
      WHERE rides.id = ride_id AND rides.driver_id = auth.uid()
    )
  );

-- recurring_ride_patterns
ALTER TABLE public.recurring_ride_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage their own recurring patterns"
  ON public.recurring_ride_patterns FOR ALL TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- favorite_routes
ALTER TABLE public.favorite_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorite routes"
  ON public.favorite_routes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 9. pg_cron extension and jobs
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- generate_recurring_rides: runs daily to create ride instances from active patterns
CREATE OR REPLACE FUNCTION public.generate_recurring_rides()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  pattern RECORD;
  target_date DATE;
  ride_exists BOOLEAN;
BEGIN
  FOR pattern IN
    SELECT * FROM public.recurring_ride_patterns WHERE is_active = true
  LOOP
    FOR i IN 0..pattern.generate_weeks_ahead LOOP
      -- Calculate the next occurrence of the pattern's day_of_week
      target_date := CURRENT_DATE + (i * 7) +
        ((pattern.day_of_week - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7);

      -- Skip past dates
      IF target_date < CURRENT_DATE THEN
        CONTINUE;
      END IF;

      -- Check if ride already exists for this date
      SELECT EXISTS (
        SELECT 1 FROM public.rides
        WHERE recurring_pattern_id = pattern.id
          AND departure_time::date = target_date
          AND status IN ('upcoming', 'in_progress')
      ) INTO ride_exists;

      IF NOT ride_exists THEN
        INSERT INTO public.rides (
          driver_id, vehicle_id,
          origin_location, origin_address,
          destination_location, destination_address,
          route_geometry, route_encoded_polyline,
          departure_time, seats_total, seats_available,
          price_czk, booking_mode, status, recurring_pattern_id
        ) VALUES (
          pattern.driver_id, pattern.vehicle_id,
          pattern.origin_location, pattern.origin_address,
          pattern.destination_location, pattern.destination_address,
          pattern.route_geometry, pattern.route_encoded_polyline,
          target_date + pattern.departure_time,
          pattern.seats_total, pattern.seats_total,
          pattern.price_czk, pattern.booking_mode, 'upcoming',
          pattern.id
        );
      END IF;
    END LOOP;

    -- Update last_generated_date
    UPDATE public.recurring_ride_patterns
    SET last_generated_date = CURRENT_DATE + (pattern.generate_weeks_ahead * 7)
    WHERE id = pattern.id;
  END LOOP;
END;
$$;

-- Schedule: run daily at 3 AM
SELECT cron.schedule(
  'generate-recurring-rides',
  '0 3 * * *',
  $$SELECT public.generate_recurring_rides();$$
);

-- ============================================================
-- 10. Ride reminder cron job (from migration 26)
-- ============================================================
SELECT cron.schedule(
  'ride-reminders',
  '*/15 * * * *',
  $$
    SELECT extensions.net.http_post(
      url := 'https://xamctptqmpruhovhjcgm.supabase.co/functions/v1/send-ride-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
