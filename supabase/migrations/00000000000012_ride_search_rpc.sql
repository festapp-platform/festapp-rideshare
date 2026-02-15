-- nearby_rides RPC function: corridor-based geospatial ride search
-- Uses ST_DWithin against route_geometry for corridor matching
-- Falls back to point matching when route_geometry is NULL

CREATE OR REPLACE FUNCTION public.nearby_rides(
  origin_lat FLOAT,
  origin_lng FLOAT,
  dest_lat FLOAT,
  dest_lng FLOAT,
  search_date DATE,
  radius_km FLOAT DEFAULT 15,
  max_results INT DEFAULT 50
)
RETURNS TABLE (
  ride_id UUID,
  driver_id UUID,
  driver_name TEXT,
  driver_avatar TEXT,
  driver_rating NUMERIC,
  driver_rating_count INT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  origin_address TEXT,
  destination_address TEXT,
  departure_time TIMESTAMPTZ,
  seats_available INT,
  price_czk NUMERIC,
  distance_meters INT,
  duration_seconds INT,
  booking_mode TEXT,
  origin_distance_m FLOAT,
  dest_distance_m FLOAT
)
SET search_path = ''
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id AS ride_id,
    r.driver_id,
    p.display_name AS driver_name,
    p.avatar_url AS driver_avatar,
    p.rating_avg AS driver_rating,
    p.rating_count AS driver_rating_count,
    v.make AS vehicle_make,
    v.model AS vehicle_model,
    v.color AS vehicle_color,
    r.origin_address,
    r.destination_address,
    r.departure_time,
    r.seats_available,
    r.price_czk,
    r.distance_meters,
    r.duration_seconds,
    r.booking_mode,
    -- Distance from search origin to ride origin
    extensions.ST_Distance(
      r.origin_location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(origin_lng, origin_lat), 4326)::extensions.geography
    ) AS origin_distance_m,
    -- Distance from search destination to ride destination
    extensions.ST_Distance(
      r.destination_location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(dest_lng, dest_lat), 4326)::extensions.geography
    ) AS dest_distance_m
  FROM public.rides r
  JOIN public.profiles p ON p.id = r.driver_id
  LEFT JOIN public.vehicles v ON v.id = r.vehicle_id
  WHERE
    r.status = 'upcoming'
    AND r.seats_available > 0
    -- Time window: rides departing on search_date to search_date + 2 days
    AND r.departure_time >= (search_date::timestamptz)
    AND r.departure_time < (search_date::timestamptz + interval '2 days')
    -- Spatial matching: route passes within radius_km of passenger's origin
    AND (
      (r.route_geometry IS NOT NULL AND extensions.ST_DWithin(
        r.route_geometry,
        extensions.ST_SetSRID(extensions.ST_MakePoint(origin_lng, origin_lat), 4326)::extensions.geography,
        radius_km * 1000
      ))
      OR
      (r.route_geometry IS NULL AND extensions.ST_DWithin(
        r.origin_location,
        extensions.ST_SetSRID(extensions.ST_MakePoint(origin_lng, origin_lat), 4326)::extensions.geography,
        radius_km * 1000
      ))
    )
    -- Spatial matching: route passes within radius_km of passenger's destination
    AND (
      (r.route_geometry IS NOT NULL AND extensions.ST_DWithin(
        r.route_geometry,
        extensions.ST_SetSRID(extensions.ST_MakePoint(dest_lng, dest_lat), 4326)::extensions.geography,
        radius_km * 1000
      ))
      OR
      (r.route_geometry IS NULL AND extensions.ST_DWithin(
        r.destination_location,
        extensions.ST_SetSRID(extensions.ST_MakePoint(dest_lng, dest_lat), 4326)::extensions.geography,
        radius_km * 1000
      ))
    )
  ORDER BY r.departure_time ASC
  LIMIT max_results;
$$;
