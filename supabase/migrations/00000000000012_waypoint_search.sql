-- Extend nearby_rides RPC with waypoint proximity matching
-- Requirement: ROUTE-03
--
-- Adds two OR clauses to the WHERE condition so passengers can find rides
-- where ANY waypoint is within the search radius of their origin or destination.
-- Uses EXISTS subqueries (not JOIN) to avoid row multiplication.
-- The GIST index on ride_waypoints.location ensures fast spatial lookup.
--
-- Backward compatible: CREATE OR REPLACE with identical signature and return type.

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
  driver_completed_rides_count INT,
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
    p.completed_rides_count AS driver_completed_rides_count,
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
    extensions.ST_Distance(
      r.origin_location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(origin_lng, origin_lat), 4326)::extensions.geography
    ) AS origin_distance_m,
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
    AND r.departure_time >= (search_date::timestamptz)
    AND r.departure_time < (search_date::timestamptz + interval '2 days')
    -- Exclude rides from drivers the caller has blocked or who blocked the caller
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = r.driver_id)
         OR (ub.blocker_id = r.driver_id AND ub.blocked_id = auth.uid())
    )
    -- Origin matching: route/point proximity OR waypoint proximity
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
      OR
      EXISTS (
        SELECT 1 FROM public.ride_waypoints rw
        WHERE rw.ride_id = r.id
          AND extensions.ST_DWithin(
            rw.location,
            extensions.ST_SetSRID(extensions.ST_MakePoint(origin_lng, origin_lat), 4326)::extensions.geography,
            radius_km * 1000
          )
      )
    )
    -- Destination matching: route/point proximity OR waypoint proximity
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
      OR
      EXISTS (
        SELECT 1 FROM public.ride_waypoints rw
        WHERE rw.ride_id = r.id
          AND extensions.ST_DWithin(
            rw.location,
            extensions.ST_SetSRID(extensions.ST_MakePoint(dest_lng, dest_lat), 4326)::extensions.geography,
            radius_km * 1000
          )
      )
    )
  ORDER BY r.departure_time ASC
  LIMIT max_results;
$$;
