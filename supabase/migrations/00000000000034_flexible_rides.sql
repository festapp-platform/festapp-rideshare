-- ============================================================
-- Migration 034: Flexible Rides (Route Intents & Subscriptions)
-- ============================================================
-- Drivers can create a "route intent" (a route without a specific date).
-- Passengers subscribe to be notified when the driver confirms a date.
-- On confirmation, a real ride is created and all subscribers are notified.
-- ============================================================

-- ============================================================
-- 1. route_intents table
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

-- Spatial indexes
CREATE INDEX idx_route_intents_origin ON public.route_intents USING GIST (origin_location);
CREATE INDEX idx_route_intents_destination ON public.route_intents USING GIST (destination_location);
CREATE INDEX idx_route_intents_driver ON public.route_intents (driver_id);
CREATE INDEX idx_route_intents_status ON public.route_intents (status);

-- ============================================================
-- 2. route_intent_subscriptions table
-- ============================================================

CREATE TABLE public.route_intent_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_intent_id UUID NOT NULL REFERENCES public.route_intents(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(route_intent_id, subscriber_id)
);

CREATE INDEX idx_route_intent_subs_subscriber ON public.route_intent_subscriptions (subscriber_id);

-- ============================================================
-- 3. RLS on route_intents
-- ============================================================

ALTER TABLE public.route_intents ENABLE ROW LEVEL SECURITY;

-- Anyone can read active/confirmed intents
CREATE POLICY "route_intents_select_public" ON public.route_intents
  FOR SELECT USING (
    status IN ('active', 'confirmed')
    OR driver_id = auth.uid()
  );

-- Authenticated users can create intents as driver
CREATE POLICY "route_intents_insert" ON public.route_intents
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND driver_id = auth.uid()
  );

-- Driver can update own active intents
CREATE POLICY "route_intents_update" ON public.route_intents
  FOR UPDATE USING (
    driver_id = auth.uid()
    AND status = 'active'
  );

-- Driver can delete own active intents
CREATE POLICY "route_intents_delete" ON public.route_intents
  FOR DELETE USING (
    driver_id = auth.uid()
    AND status = 'active'
  );

-- ============================================================
-- 4. RLS on route_intent_subscriptions
-- ============================================================

ALTER TABLE public.route_intent_subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriber can read own subscriptions; driver can see subscribers on own intents
CREATE POLICY "subs_select" ON public.route_intent_subscriptions
  FOR SELECT USING (
    subscriber_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.route_intents ri
      WHERE ri.id = route_intent_id AND ri.driver_id = auth.uid()
    )
  );

-- Authenticated users can subscribe (not to own intent)
CREATE POLICY "subs_insert" ON public.route_intent_subscriptions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND subscriber_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.route_intents ri
      WHERE ri.id = route_intent_id AND ri.driver_id = auth.uid()
    )
  );

-- Subscriber can remove own subscription
CREATE POLICY "subs_delete" ON public.route_intent_subscriptions
  FOR DELETE USING (
    subscriber_id = auth.uid()
  );

-- ============================================================
-- 5. Trigger: increment/decrement subscriber_count
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
-- 6. RPCs
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
-- 7. Trigger: update updated_at on route_intents modification
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
-- 8. Add flexible_ride_confirmed to send-notification valid types
-- ============================================================
-- Note: The _notify() helper posts to send-notification Edge Function.
-- The type 'flexible_ride_confirmed' must be accepted by the function.
-- This is handled by adding it to the VALID_TYPES array in the
-- send-notification Edge Function code.
