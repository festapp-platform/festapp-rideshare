-- Community: events, flexible rides, gamification, community stats, rate limiting
-- Squashed from migrations 033, 034, 035, 036, 037

-- ============================================================
-- 1. Events table
-- ============================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 200),
  description TEXT CHECK (char_length(description) <= 2000),
  location_address TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_location ON public.events USING GIST (location);
CREATE INDEX idx_events_status_date ON public.events (status, event_date);
CREATE INDEX idx_events_creator ON public.events (creator_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Add FK from rides.event_id -> events.id (column created in 002_rides.sql without FK)
ALTER TABLE public.rides
  ADD CONSTRAINT rides_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

-- ============================================================
-- 2. RLS policies on events
-- ============================================================
CREATE POLICY "Anyone can read approved events"
  ON public.events FOR SELECT TO authenticated
  USING (
    status = 'approved'
    OR creator_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Admin can update events"
  ON public.events FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Creators can delete own pending events"
  ON public.events FOR DELETE TO authenticated
  USING (creator_id = auth.uid() AND status = 'pending');

-- ============================================================
-- 3. Events updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_events_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_events_updated
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_events_updated_at();

-- ============================================================
-- 4. Event admin RPCs
-- ============================================================

-- admin_approve_event
CREATE OR REPLACE FUNCTION public.admin_approve_event(p_event_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_creator_id UUID;
  v_event_name TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.events
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = p_event_id AND status = 'pending'
  RETURNING creator_id, name INTO v_creator_id, v_event_name;

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Event not found or not pending';
  END IF;

  -- Notify creator
  PERFORM public._notify(
    v_creator_id,
    'event_approved',
    'Event Approved',
    'Your event "' || v_event_name || '" has been approved and is now visible to all users.',
    jsonb_build_object('event_id', p_event_id::text)
  );
END;
$$;

-- admin_reject_event
CREATE OR REPLACE FUNCTION public.admin_reject_event(
  p_event_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_creator_id UUID;
  v_event_name TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.events
  SET status = 'rejected',
      admin_notes = p_reason
  WHERE id = p_event_id AND status = 'pending'
  RETURNING creator_id, name INTO v_creator_id, v_event_name;

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Event not found or not pending';
  END IF;

  -- Notify creator
  PERFORM public._notify(
    v_creator_id,
    'event_rejected',
    'Event Not Approved',
    'Your event "' || v_event_name || '" was not approved.' ||
      CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
    jsonb_build_object('event_id', p_event_id::text)
  );
END;
$$;

-- ============================================================
-- 5. get_event_rides RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_event_rides(p_event_id UUID)
RETURNS TABLE (
  ride_id UUID,
  driver_id UUID,
  driver_name TEXT,
  driver_avatar TEXT,
  driver_rating NUMERIC,
  origin_address TEXT,
  destination_address TEXT,
  departure_time TIMESTAMPTZ,
  seats_available INT,
  price_czk INT,
  booking_mode TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_event_status TEXT;
BEGIN
  -- Only return rides for approved events
  SELECT e.status INTO v_event_status
  FROM public.events e WHERE e.id = p_event_id;

  IF v_event_status IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event_status <> 'approved' THEN
    RETURN; -- Return empty result set for non-approved events
  END IF;

  RETURN QUERY
  SELECT
    r.id AS ride_id,
    r.driver_id,
    p.display_name AS driver_name,
    p.avatar_url AS driver_avatar,
    p.rating_avg AS driver_rating,
    r.origin_address,
    r.destination_address,
    r.departure_time,
    r.seats_available,
    r.price_czk,
    r.booking_mode
  FROM public.rides r
  JOIN public.profiles p ON p.id = r.driver_id
  WHERE r.event_id = p_event_id
    AND r.status = 'upcoming'
    -- Block filtering: exclude rides from/to blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = r.driver_id)
         OR (ub.blocker_id = r.driver_id AND ub.blocked_id = auth.uid())
    )
  ORDER BY r.departure_time ASC;
END;
$$;

-- ============================================================
-- 6. Route intents table (flexible rides)
-- ============================================================
CREATE TABLE public.route_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  origin_location GEOGRAPHY(POINT, 4326) NOT NULL,
  origin_address TEXT NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_address TEXT NOT NULL,
  route_geometry GEOGRAPHY(LINESTRING, 4326),
  route_encoded_polyline TEXT,
  seats_total INT NOT NULL DEFAULT 4 CHECK (seats_total BETWEEN 1 AND 8),
  price_czk INT,
  booking_mode TEXT NOT NULL DEFAULT 'instant' CHECK (booking_mode IN ('instant', 'request')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'expired', 'cancelled')),
  confirmed_ride_id UUID REFERENCES public.rides(id),
  subscriber_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_route_intents_origin ON public.route_intents USING GIST (origin_location);
CREATE INDEX idx_route_intents_destination ON public.route_intents USING GIST (destination_location);
CREATE INDEX idx_route_intents_driver ON public.route_intents (driver_id);
CREATE INDEX idx_route_intents_status ON public.route_intents (status);

ALTER TABLE public.route_intents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. Route intent subscriptions table
-- ============================================================
CREATE TABLE public.route_intent_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_intent_id UUID NOT NULL REFERENCES public.route_intents(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(route_intent_id, subscriber_id)
);

CREATE INDEX idx_route_intent_subs_subscriber ON public.route_intent_subscriptions (subscriber_id);

ALTER TABLE public.route_intent_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. RLS on route_intents
-- ============================================================
CREATE POLICY "route_intents_select_public" ON public.route_intents
  FOR SELECT USING (
    status IN ('active', 'confirmed')
    OR driver_id = auth.uid()
  );

CREATE POLICY "route_intents_insert" ON public.route_intents
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND driver_id = auth.uid()
  );

CREATE POLICY "route_intents_update" ON public.route_intents
  FOR UPDATE USING (
    driver_id = auth.uid()
    AND status = 'active'
  );

CREATE POLICY "route_intents_delete" ON public.route_intents
  FOR DELETE USING (
    driver_id = auth.uid()
    AND status = 'active'
  );

-- ============================================================
-- 9. RLS on route_intent_subscriptions
-- ============================================================
CREATE POLICY "subs_select" ON public.route_intent_subscriptions
  FOR SELECT USING (
    subscriber_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.route_intents ri
      WHERE ri.id = route_intent_id AND ri.driver_id = auth.uid()
    )
  );

CREATE POLICY "subs_insert" ON public.route_intent_subscriptions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND subscriber_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.route_intents ri
      WHERE ri.id = route_intent_id AND ri.driver_id = auth.uid()
    )
  );

CREATE POLICY "subs_delete" ON public.route_intent_subscriptions
  FOR DELETE USING (
    subscriber_id = auth.uid()
  );

-- ============================================================
-- 10. Trigger: increment/decrement subscriber_count
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_route_intent_subscriber_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.route_intents
      SET subscriber_count = subscriber_count + 1
      WHERE id = NEW.route_intent_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.route_intents
      SET subscriber_count = subscriber_count - 1
      WHERE id = OLD.route_intent_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_subscription_change
  AFTER INSERT OR DELETE ON public.route_intent_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_route_intent_subscriber_count();

-- ============================================================
-- 11. Route intent RPCs
-- ============================================================

-- confirm_route_intent: creates a ride, notifies subscribers, returns ride_id
CREATE OR REPLACE FUNCTION public.confirm_route_intent(
  p_intent_id UUID,
  p_departure_time TIMESTAMPTZ,
  p_seats INT DEFAULT NULL,
  p_price INT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_intent RECORD;
  v_ride_id UUID;
  v_driver_name TEXT;
  v_sub RECORD;
  v_formatted_date TEXT;
BEGIN
  -- Lock the intent row
  SELECT * INTO v_intent
    FROM public.route_intents
    WHERE id = p_intent_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Route intent not found';
  END IF;

  IF v_intent.driver_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the driver can confirm this route intent';
  END IF;

  IF v_intent.status != 'active' THEN
    RAISE EXCEPTION 'Only active route intents can be confirmed';
  END IF;

  -- Create the ride from intent data
  INSERT INTO public.rides (
    driver_id,
    vehicle_id,
    origin_location,
    origin_address,
    destination_location,
    destination_address,
    route_geometry,
    route_encoded_polyline,
    departure_time,
    seats_total,
    seats_available,
    price_czk,
    booking_mode,
    notes
  ) VALUES (
    v_intent.driver_id,
    v_intent.vehicle_id,
    v_intent.origin_location,
    v_intent.origin_address,
    v_intent.destination_location,
    v_intent.destination_address,
    v_intent.route_geometry,
    v_intent.route_encoded_polyline,
    p_departure_time,
    COALESCE(p_seats, v_intent.seats_total),
    COALESCE(p_seats, v_intent.seats_total),
    COALESCE(p_price, v_intent.price_czk),
    v_intent.booking_mode,
    v_intent.notes
  )
  RETURNING id INTO v_ride_id;

  -- Update intent status
  UPDATE public.route_intents
    SET status = 'confirmed',
        confirmed_ride_id = v_ride_id,
        updated_at = now()
    WHERE id = p_intent_id;

  -- Get driver name for notification
  SELECT display_name INTO v_driver_name
    FROM public.profiles
    WHERE id = v_intent.driver_id;

  -- Format date for notification body
  v_formatted_date := to_char(p_departure_time AT TIME ZONE 'Europe/Prague', 'DD Mon YYYY at HH24:MI');

  -- Notify all subscribers
  FOR v_sub IN
    SELECT subscriber_id
      FROM public.route_intent_subscriptions
      WHERE route_intent_id = p_intent_id
  LOOP
    PERFORM public._notify(
      v_sub.subscriber_id,
      'flexible_ride_confirmed',
      'Route confirmed!',
      COALESCE(v_driver_name, 'A driver') || ' confirmed ' ||
        v_intent.origin_address || ' -> ' || v_intent.destination_address ||
        ' on ' || v_formatted_date,
      jsonb_build_object('ride_id', v_ride_id::text)
    );
  END LOOP;

  RETURN v_ride_id;
END;
$$;

-- cancel_route_intent: sets status to cancelled
CREATE OR REPLACE FUNCTION public.cancel_route_intent(
  p_intent_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_intent RECORD;
BEGIN
  SELECT * INTO v_intent
    FROM public.route_intents
    WHERE id = p_intent_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Route intent not found';
  END IF;

  IF v_intent.driver_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the driver can cancel this route intent';
  END IF;

  IF v_intent.status != 'active' THEN
    RAISE EXCEPTION 'Only active route intents can be cancelled';
  END IF;

  UPDATE public.route_intents
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_intent_id;
END;
$$;

-- ============================================================
-- 12. Route intents updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_route_intents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_route_intent_update
  BEFORE UPDATE ON public.route_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_route_intents_updated_at();

-- ============================================================
-- 13. Badge definitions (reference data)
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
-- 14. User achievements table
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
CREATE POLICY "user_achievements_select" ON public.user_achievements FOR SELECT USING (true);

-- ============================================================
-- 15. Route streaks table
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
-- 16. Gamification RPCs
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
-- 17. Badge awarding triggers
-- ============================================================

-- Auto-award badges on ride completion
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

-- Review badges trigger
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
-- 18. Community impact RPC
-- ============================================================
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

-- ============================================================
-- 19. API rate limiting
-- ============================================================
CREATE TABLE public.api_rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier TEXT NOT NULL,        -- IP address or user ID
  endpoint TEXT NOT NULL,          -- function name
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX idx_api_rate_limits_lookup
  ON public.api_rate_limits (identifier, endpoint, window_start);

-- Enable RLS with no policies (accessed only via SECURITY DEFINER functions)
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Cleanup function: deletes entries older than 1 hour
CREATE OR REPLACE FUNCTION clean_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.api_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Schedule cleanup every 15 minutes
SELECT cron.schedule('clean-rate-limits', '*/15 * * * *', 'SELECT clean_rate_limits()');
