-- Test helper RPCs for integration tests.
-- Applied to local DB only via: supabase db execute --local -f test-helpers.sql
-- These are NOT production migrations.

-- Helper: Create a ride with PostGIS geography columns
-- (Supabase JS client cannot insert geography types directly)
CREATE OR REPLACE FUNCTION public._test_create_ride(
  p_driver_id UUID,
  p_vehicle_id UUID DEFAULT NULL,
  p_origin_lat FLOAT DEFAULT 50.0755,
  p_origin_lng FLOAT DEFAULT 14.4378,
  p_origin_address TEXT DEFAULT 'Prague Old Town',
  p_dest_lat FLOAT DEFAULT 49.1951,
  p_dest_lng FLOAT DEFAULT 16.6068,
  p_dest_address TEXT DEFAULT 'Brno Center',
  p_departure_time TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),
  p_seats_total INT DEFAULT 4,
  p_seats_available INT DEFAULT 4,
  p_price_czk NUMERIC DEFAULT 250,
  p_booking_mode TEXT DEFAULT 'instant',
  p_status TEXT DEFAULT 'upcoming',
  p_route_geometry TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.rides (
    driver_id, vehicle_id,
    origin_location, origin_address,
    destination_location, destination_address,
    departure_time, seats_total, seats_available,
    price_czk, booking_mode, status, route_geometry
  ) VALUES (
    p_driver_id, p_vehicle_id,
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_origin_lng, p_origin_lat), 4326)::extensions.geography,
    p_origin_address,
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_dest_lng, p_dest_lat), 4326)::extensions.geography,
    p_dest_address,
    p_departure_time, p_seats_total, p_seats_available,
    p_price_czk, p_booking_mode, p_status,
    CASE WHEN p_route_geometry IS NOT NULL
      THEN extensions.ST_GeomFromText(p_route_geometry, 4326)::extensions.geography
      ELSE NULL END
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION public._test_create_ride TO authenticated, service_role;
