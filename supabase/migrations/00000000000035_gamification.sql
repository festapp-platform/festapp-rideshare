-- Gamification: badge definitions, user achievements, route streaks, impact stats, and nearby_rides extension
-- Adds achievement badges, user level support, and impact stats calculation

-- ============================================================
-- 1. badge_definitions (reference data)
-- ============================================================
CREATE TABLE public.badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('rides', 'reviews', 'streaks', 'special')),
  threshold INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public reference data, anyone can read
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badge_definitions_select" ON public.badge_definitions FOR SELECT USING (true);

-- Seed badge definitions
INSERT INTO public.badge_definitions (id, name, description, icon, category, threshold) VALUES
  ('first_ride', 'First Ride', 'Completed your first ride', '🚗', 'rides', 1),
  ('rides_10', 'Regular Rider', 'Completed 10 rides', '🛣️', 'rides', 10),
  ('rides_25', 'Road Warrior', 'Completed 25 rides', '⚡', 'rides', 25),
  ('rides_50', 'Highway Hero', 'Completed 50 rides', '🦸', 'rides', 50),
  ('rides_100', 'Legend of the Road', 'Completed 100 rides', '🏆', 'rides', 100),
  ('first_review', 'First Feedback', 'Left your first review', '💬', 'reviews', 1),
  ('five_star', 'Perfect Score', 'Received a 5-star rating', '⭐', 'reviews', 1),
  ('streak_4', 'Month Streak', 'Shared same route 4 consecutive weeks', '🔥', 'streaks', 4),
  ('streak_12', 'Quarter Streak', 'Shared same route 12 consecutive weeks', '💪', 'streaks', 12),
  ('streak_26', 'Half Year Streak', 'Shared same route 26 consecutive weeks', '👑', 'streaks', 26);


-- ============================================================
-- 2. user_achievements
-- ============================================================
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badge_definitions(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
-- Badges are public (anyone can see anyone's badges)
CREATE POLICY "user_achievements_select" ON public.user_achievements FOR SELECT USING (true);


-- ============================================================
-- 3. route_streaks
-- ============================================================
CREATE TABLE public.route_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  current_streak INT NOT NULL DEFAULT 1,
  longest_streak INT NOT NULL DEFAULT 1,
  last_ride_week TEXT NOT NULL, -- ISO week: '2026-W07'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, origin_address, destination_address)
);

CREATE INDEX idx_route_streaks_user ON public.route_streaks(user_id);

ALTER TABLE public.route_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "route_streaks_select_own" ON public.route_streaks FOR SELECT
  USING (auth.uid() = user_id);


-- ============================================================
-- 4. RPCs
-- ============================================================

-- get_user_impact: Calculate impact stats from completed rides
CREATE OR REPLACE FUNCTION public.get_user_impact(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  total_rides_completed BIGINT,
  total_co2_saved_kg NUMERIC,
  total_money_saved_czk NUMERIC,
  total_distance_km NUMERIC,
  total_passengers_carried BIGINT
)
SET search_path = ''
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH driver_rides AS (
    SELECT
      r.id,
      COALESCE(r.distance_meters, 0) AS distance_meters,
      COALESCE(r.price_czk, 0) AS price_czk,
      (SELECT COUNT(*) FROM public.bookings b WHERE b.ride_id = r.id AND b.status = 'confirmed') AS confirmed_passengers
    FROM public.rides r
    WHERE r.driver_id = p_user_id AND r.status = 'completed'
  ),
  passenger_rides AS (
    SELECT
      r.id,
      COALESCE(r.distance_meters, 0) AS distance_meters,
      COALESCE(r.price_czk, 0) AS price_czk
    FROM public.rides r
    JOIN public.bookings b ON b.ride_id = r.id
    WHERE b.passenger_id = p_user_id AND b.status = 'confirmed' AND r.status = 'completed'
  )
  SELECT
    (SELECT COUNT(*) FROM driver_rides) + (SELECT COUNT(*) FROM passenger_rides) AS total_rides_completed,
    ROUND(
      (
        (SELECT COALESCE(SUM(distance_meters), 0) FROM driver_rides) +
        (SELECT COALESCE(SUM(distance_meters), 0) FROM passenger_rides)
      ) * 0.000120, 2
    ) AS total_co2_saved_kg,
    ROUND(
      (SELECT COALESCE(SUM(price_czk * confirmed_passengers), 0) FROM driver_rides) +
      (SELECT COALESCE(SUM(price_czk), 0) FROM passenger_rides),
      0
    ) AS total_money_saved_czk,
    ROUND(
      (
        (SELECT COALESCE(SUM(distance_meters), 0) FROM driver_rides) +
        (SELECT COALESCE(SUM(distance_meters), 0) FROM passenger_rides)
      ) / 1000.0, 1
    ) AS total_distance_km,
    (SELECT COALESCE(SUM(confirmed_passengers), 0) FROM driver_rides) AS total_passengers_carried;
$$;


-- get_user_badges: Get all earned badges for a user
CREATE OR REPLACE FUNCTION public.get_user_badges(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  badge_id TEXT,
  name TEXT,
  description TEXT,
  icon TEXT,
  category TEXT,
  threshold INT,
  earned_at TIMESTAMPTZ
)
SET search_path = ''
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    bd.id AS badge_id,
    bd.name,
    bd.description,
    bd.icon,
    bd.category,
    bd.threshold,
    ua.earned_at
  FROM public.user_achievements ua
  JOIN public.badge_definitions bd ON bd.id = ua.badge_id
  WHERE ua.user_id = p_user_id
  ORDER BY ua.earned_at DESC;
$$;


-- get_route_streaks: Get route streaks for a user
CREATE OR REPLACE FUNCTION public.get_route_streaks(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  origin_address TEXT,
  destination_address TEXT,
  current_streak INT,
  longest_streak INT,
  last_ride_week TEXT
)
SET search_path = ''
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    rs.id,
    rs.origin_address,
    rs.destination_address,
    rs.current_streak,
    rs.longest_streak,
    rs.last_ride_week
  FROM public.route_streaks rs
  WHERE rs.user_id = p_user_id
  ORDER BY rs.current_streak DESC;
$$;


-- ============================================================
-- 5. Trigger: Auto-award badges on ride completion
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_rides INT;
  v_passenger_id UUID;
  v_passenger_rides INT;
  v_ride_week TEXT;
  v_prev_week TEXT;
  v_badge_thresholds INT[] := ARRAY[1, 10, 25, 50, 100];
  v_badge_ids TEXT[] := ARRAY['first_ride', 'rides_10', 'rides_25', 'rides_50', 'rides_100'];
  v_streak_thresholds INT[] := ARRAY[4, 12, 26];
  v_streak_badge_ids TEXT[] := ARRAY['streak_4', 'streak_12', 'streak_26'];
  i INT;
BEGIN
  -- Only fire when status changes to 'completed'
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get driver's completed ride count from profile
  SELECT completed_rides_count INTO v_driver_rides
  FROM public.profiles WHERE id = NEW.driver_id;

  -- Award ride milestone badges to driver
  FOR i IN 1..array_length(v_badge_thresholds, 1) LOOP
    IF v_driver_rides >= v_badge_thresholds[i] THEN
      INSERT INTO public.user_achievements (user_id, badge_id)
      VALUES (NEW.driver_id, v_badge_ids[i])
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Route streak logic for driver
  v_ride_week := to_char(NEW.departure_time, 'IYYY-"W"IW');
  -- Calculate previous ISO week
  v_prev_week := to_char(NEW.departure_time - interval '7 days', 'IYYY-"W"IW');

  INSERT INTO public.route_streaks (user_id, origin_address, destination_address, current_streak, longest_streak, last_ride_week)
  VALUES (NEW.driver_id, NEW.origin_address, NEW.destination_address, 1, 1, v_ride_week)
  ON CONFLICT (user_id, origin_address, destination_address) DO UPDATE SET
    current_streak = CASE
      WHEN public.route_streaks.last_ride_week = v_ride_week THEN public.route_streaks.current_streak -- same week, no change
      WHEN public.route_streaks.last_ride_week = v_prev_week THEN public.route_streaks.current_streak + 1 -- consecutive week
      ELSE 1 -- gap, reset
    END,
    longest_streak = GREATEST(
      public.route_streaks.longest_streak,
      CASE
        WHEN public.route_streaks.last_ride_week = v_ride_week THEN public.route_streaks.current_streak
        WHEN public.route_streaks.last_ride_week = v_prev_week THEN public.route_streaks.current_streak + 1
        ELSE 1
      END
    ),
    last_ride_week = v_ride_week,
    updated_at = NOW();

  -- Check streak badges for driver
  DECLARE
    v_current INT;
  BEGIN
    SELECT current_streak INTO v_current
    FROM public.route_streaks
    WHERE user_id = NEW.driver_id
      AND origin_address = NEW.origin_address
      AND destination_address = NEW.destination_address;

    FOR i IN 1..array_length(v_streak_thresholds, 1) LOOP
      IF v_current >= v_streak_thresholds[i] THEN
        INSERT INTO public.user_achievements (user_id, badge_id)
        VALUES (NEW.driver_id, v_streak_badge_ids[i])
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    END LOOP;
  END;

  -- Award badges to confirmed passengers
  FOR v_passenger_id IN
    SELECT b.passenger_id FROM public.bookings b
    WHERE b.ride_id = NEW.id AND b.status = 'confirmed'
  LOOP
    SELECT completed_rides_count INTO v_passenger_rides
    FROM public.profiles WHERE id = v_passenger_id;

    FOR i IN 1..array_length(v_badge_thresholds, 1) LOOP
      IF v_passenger_rides >= v_badge_thresholds[i] THEN
        INSERT INTO public.user_achievements (user_id, badge_id)
        VALUES (v_passenger_id, v_badge_ids[i])
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_and_award_badges
  AFTER UPDATE ON public.rides
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.check_and_award_badges();


-- ============================================================
-- 6. Trigger: Review badges
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_review_badges()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Award 'first_review' badge to reviewer
  INSERT INTO public.user_achievements (user_id, badge_id)
  VALUES (NEW.reviewer_id, 'first_review')
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  -- If 5-star rating and review is revealed, award 'five_star' to reviewee
  IF NEW.rating = 5 AND NEW.revealed_at IS NOT NULL THEN
    INSERT INTO public.user_achievements (user_id, badge_id)
    VALUES (NEW.reviewee_id, 'five_star')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_review_badges
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_review_badges();


-- ============================================================
-- 7. Extend nearby_rides with completed_rides_count
-- ============================================================
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
