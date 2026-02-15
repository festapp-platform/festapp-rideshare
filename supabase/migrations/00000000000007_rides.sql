-- Rides table with PostGIS geography columns for geospatial search
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
  luggage_size TEXT DEFAULT 'medium' CHECK (luggage_size IN ('none', 'small', 'medium', 'large')),
  booking_mode TEXT DEFAULT 'request' CHECK (booking_mode IN ('instant', 'request')),
  preferences JSONB DEFAULT '{}',
  notes TEXT,

  -- Status management
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),

  -- Recurring ride link (FK added after patterns table creation)
  recurring_pattern_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GIST spatial indexes for performant geospatial queries
CREATE INDEX idx_rides_origin_geo ON public.rides USING GIST (origin_location);
CREATE INDEX idx_rides_destination_geo ON public.rides USING GIST (destination_location);
CREATE INDEX idx_rides_route_geo ON public.rides USING GIST (route_geometry);

-- Composite index for active ride search (status + departure time)
CREATE INDEX idx_rides_active_departure ON public.rides (departure_time)
  WHERE status = 'upcoming';

-- Driver's rides lookup
CREATE INDEX idx_rides_driver ON public.rides (driver_id, departure_time DESC);

-- Auto-update updated_at using existing trigger function from initial_setup
CREATE TRIGGER update_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
