-- Migration: Community stats RPC
-- Provides platform-wide impact totals for the community stats page.

CREATE OR REPLACE FUNCTION get_community_impact()
RETURNS TABLE(
  total_rides bigint,
  total_users bigint,
  total_co2_saved_kg numeric,
  total_distance_km numeric,
  total_money_shared_czk numeric,
  active_drivers bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total completed rides
    (SELECT COUNT(*) FROM rides WHERE status = 'completed')::bigint AS total_rides,
    -- Total registered users
    (SELECT COUNT(*) FROM profiles)::bigint AS total_users,
    -- Total CO2 saved: distance_meters * confirmed_passengers * 0.000120 (120g CO2/km = 0.120kg/km = 0.000120 kg/m)
    COALESCE(
      (SELECT SUM(r.distance_meters * sub.confirmed_count * 0.000120)
       FROM rides r
       JOIN (
         SELECT ride_id, COUNT(*)::int AS confirmed_count
         FROM bookings
         WHERE status = 'confirmed'
         GROUP BY ride_id
       ) sub ON sub.ride_id = r.id
       WHERE r.status = 'completed' AND r.distance_meters IS NOT NULL),
      0
    )::numeric AS total_co2_saved_kg,
    -- Total distance shared (km)
    COALESCE(
      (SELECT SUM(r.distance_meters * sub.confirmed_count / 1000.0)
       FROM rides r
       JOIN (
         SELECT ride_id, COUNT(*)::int AS confirmed_count
         FROM bookings
         WHERE status = 'confirmed'
         GROUP BY ride_id
       ) sub ON sub.ride_id = r.id
       WHERE r.status = 'completed' AND r.distance_meters IS NOT NULL),
      0
    )::numeric AS total_distance_km,
    -- Total money shared
    COALESCE(
      (SELECT SUM(r.price_czk * sub.confirmed_count)
       FROM rides r
       JOIN (
         SELECT ride_id, COUNT(*)::int AS confirmed_count
         FROM bookings
         WHERE status = 'confirmed'
         GROUP BY ride_id
       ) sub ON sub.ride_id = r.id
       WHERE r.status = 'completed' AND r.price_czk IS NOT NULL),
      0
    )::numeric AS total_money_shared_czk,
    -- Active drivers (distinct drivers with completed rides)
    (SELECT COUNT(DISTINCT driver_id) FROM rides WHERE status = 'completed')::bigint AS active_drivers;
END;
$$;

-- Allow anyone to call (public page)
GRANT EXECUTE ON FUNCTION get_community_impact() TO anon, authenticated;
