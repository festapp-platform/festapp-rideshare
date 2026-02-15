-- Ride waypoints: suggested pickup/dropoff points along a ride route
CREATE TABLE public.ride_waypoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address TEXT NOT NULL,
  order_index INT NOT NULL,
  type TEXT DEFAULT 'pickup' CHECK (type IN ('pickup', 'dropoff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index on waypoint location
CREATE INDEX idx_ride_waypoints_location ON public.ride_waypoints USING GIST (location);

-- Lookup waypoints by ride in order
CREATE INDEX idx_ride_waypoints_ride_order ON public.ride_waypoints (ride_id, order_index);
