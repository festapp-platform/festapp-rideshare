-- Reports and user blocks tables with RPCs, RLS policies,
-- and block-aware modifications to existing search/booking/chat RPCs.

-- ============================================================
-- 1. Reports table
-- ============================================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  review_id UUID REFERENCES public.reviews(id) ON DELETE SET NULL,
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX idx_reports_reported_user ON public.reports(reported_user_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. User blocks table
-- ============================================================
CREATE TABLE public.user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON public.user_blocks(blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS policies
-- ============================================================

-- Reports: authenticated users can insert their own, see their own + admins see all
CREATE POLICY "Users can insert own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Note: is_admin() is defined in the next migration (00000000000031).
-- We use a forward-compatible pattern here: own reports OR admin check via JWT.
CREATE POLICY "Users can view own reports or admin sees all"
  ON public.reports FOR SELECT TO authenticated
  USING (
    reporter_id = auth.uid()
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
  );

CREATE POLICY "Admin can update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

-- User blocks: users manage their own blocks
CREATE POLICY "Users can manage own blocks"
  ON public.user_blocks FOR ALL TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- ============================================================
-- 4. report_user RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.report_user(
  p_reported_user_id UUID,
  p_description TEXT,
  p_ride_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_review_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_report_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Cannot report self
  IF v_user_id = p_reported_user_id THEN
    RAISE EXCEPTION 'Cannot report yourself';
  END IF;

  -- Validate description length
  IF char_length(p_description) < 10 OR char_length(p_description) > 2000 THEN
    RAISE EXCEPTION 'Description must be between 10 and 2000 characters';
  END IF;

  INSERT INTO public.reports (reporter_id, reported_user_id, description, ride_id, booking_id, review_id)
  VALUES (v_user_id, p_reported_user_id, p_description, p_ride_id, p_booking_id, p_review_id)
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

-- ============================================================
-- 5. block_user / unblock_user / get_blocked_users RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.block_user(p_blocked_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id = p_blocked_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (v_user_id, p_blocked_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_user(p_blocked_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.user_blocks
  WHERE blocker_id = auth.uid() AND blocked_id = p_blocked_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  blocked_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    ub.created_at AS blocked_at
  FROM public.user_blocks ub
  JOIN public.profiles p ON p.id = ub.blocked_id
  WHERE ub.blocker_id = auth.uid()
  ORDER BY ub.created_at DESC;
$$;

-- ============================================================
-- 6. Block-aware nearby_rides (CREATE OR REPLACE preserving all existing logic)
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
    -- Block filter: exclude rides where driver/searcher have blocked each other
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = r.driver_id)
         OR (blocker_id = r.driver_id AND blocked_id = auth.uid())
    )
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

-- ============================================================
-- 7. Block-aware book_ride_instant (preserve all existing logic, add block check)
-- ============================================================
CREATE OR REPLACE FUNCTION public.book_ride_instant(
  p_ride_id UUID,
  p_passenger_id UUID,
  p_seats INT DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_booking_id UUID;
  v_available INT;
  v_driver_id UUID;
  v_booking_mode TEXT;
  v_status TEXT;
BEGIN
  -- Lock the ride row to prevent concurrent modifications
  SELECT seats_available, driver_id, booking_mode, status
  INTO v_available, v_driver_id, v_booking_mode, v_status
  FROM public.rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF v_status != 'upcoming' THEN
    RAISE EXCEPTION 'Ride is not available for booking';
  END IF;

  IF v_booking_mode != 'instant' THEN
    RAISE EXCEPTION 'Ride requires request approval';
  END IF;

  IF v_driver_id = p_passenger_id THEN
    RAISE EXCEPTION 'Driver cannot book own ride';
  END IF;

  -- Block check: prevent booking if either user has blocked the other
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = p_passenger_id AND blocked_id = v_driver_id)
       OR (blocker_id = v_driver_id AND blocked_id = p_passenger_id)
  ) THEN
    RAISE EXCEPTION 'Unable to book this ride';
  END IF;

  IF v_available < p_seats THEN
    RAISE EXCEPTION 'Not enough seats available';
  END IF;

  -- Check for existing active booking
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE ride_id = p_ride_id AND passenger_id = p_passenger_id
    AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'Already booked on this ride';
  END IF;

  -- Create booking as confirmed (instant)
  INSERT INTO public.bookings (ride_id, passenger_id, seats_booked, status)
  VALUES (p_ride_id, p_passenger_id, p_seats, 'confirmed')
  RETURNING id INTO v_booking_id;

  -- Decrement available seats
  UPDATE public.rides
  SET seats_available = seats_available - p_seats
  WHERE id = p_ride_id;

  RETURN v_booking_id;
END;
$$;

-- ============================================================
-- 8. Block-aware request_ride_booking (preserve all existing logic, add block check)
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_ride_booking(
  p_ride_id UUID,
  p_passenger_id UUID,
  p_seats INT DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_booking_id UUID;
  v_available INT;
  v_driver_id UUID;
  v_status TEXT;
BEGIN
  SELECT seats_available, driver_id, status
  INTO v_available, v_driver_id, v_status
  FROM public.rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF v_status != 'upcoming' THEN
    RAISE EXCEPTION 'Ride is not available for booking';
  END IF;

  IF v_driver_id = p_passenger_id THEN
    RAISE EXCEPTION 'Driver cannot book own ride';
  END IF;

  -- Block check: prevent booking if either user has blocked the other
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = p_passenger_id AND blocked_id = v_driver_id)
       OR (blocker_id = v_driver_id AND blocked_id = p_passenger_id)
  ) THEN
    RAISE EXCEPTION 'Unable to book this ride';
  END IF;

  IF v_available < p_seats THEN
    RAISE EXCEPTION 'Not enough seats available';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE ride_id = p_ride_id AND passenger_id = p_passenger_id
    AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'Already requested this ride';
  END IF;

  INSERT INTO public.bookings (ride_id, passenger_id, seats_booked, status)
  VALUES (p_ride_id, p_passenger_id, p_seats, 'pending')
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

-- ============================================================
-- 9. Block-aware send_chat_message (preserve all existing logic, add block check)
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_message_id UUID;
  v_sender_id UUID;
  v_other_id UUID;
  v_driver_id UUID;
  v_passenger_id UUID;
BEGIN
  v_sender_id := auth.uid();

  -- Verify sender is a participant and get conversation details
  SELECT driver_id, passenger_id
  INTO v_driver_id, v_passenger_id
  FROM public.chat_conversations
  WHERE id = p_conversation_id
    AND (driver_id = v_sender_id OR passenger_id = v_sender_id);

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;

  -- Determine other participant
  IF v_sender_id = v_driver_id THEN
    v_other_id := v_passenger_id;
  ELSE
    v_other_id := v_driver_id;
  END IF;

  -- Block check: prevent messaging if either user has blocked the other
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = v_sender_id AND blocked_id = v_other_id)
       OR (blocker_id = v_other_id AND blocked_id = v_sender_id)
  ) THEN
    RAISE EXCEPTION 'Unable to send message';
  END IF;

  -- Validate content length
  IF char_length(p_content) < 1 OR char_length(p_content) > 2000 THEN
    RAISE EXCEPTION 'Message content must be between 1 and 2000 characters';
  END IF;

  -- Validate message type
  IF p_message_type NOT IN ('text', 'phone_share') THEN
    RAISE EXCEPTION 'Invalid message type';
  END IF;

  -- Insert message
  INSERT INTO public.chat_messages (conversation_id, sender_id, content, message_type)
  VALUES (p_conversation_id, v_sender_id, p_content, p_message_type)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;
