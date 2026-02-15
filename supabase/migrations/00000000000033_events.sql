-- Events system: events table with admin approval workflow, rides.event_id link,
-- RLS policies, admin approval RPCs, get_event_rides RPC, updated_at trigger.

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

-- ============================================================
-- 2. Add event_id to rides table
-- ============================================================
ALTER TABLE public.rides ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;
CREATE INDEX idx_rides_event_id ON public.rides (event_id) WHERE event_id IS NOT NULL;

-- ============================================================
-- 3. RLS policies on events
-- ============================================================

-- SELECT: anyone can read approved events
CREATE POLICY "Anyone can read approved events"
  ON public.events FOR SELECT TO authenticated
  USING (
    status = 'approved'
    OR creator_id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: authenticated users can create events (creator_id must match)
CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- UPDATE: only admins (via RPCs, but policy needed for SECURITY DEFINER functions)
CREATE POLICY "Admin can update events"
  ON public.events FOR UPDATE TO authenticated
  USING (public.is_admin());

-- DELETE: creators can delete their own pending events
CREATE POLICY "Creators can delete own pending events"
  ON public.events FOR DELETE TO authenticated
  USING (creator_id = auth.uid() AND status = 'pending');

-- ============================================================
-- 4. Updated_at trigger
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
-- 5. Admin approval RPCs
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
-- 6. get_event_rides RPC
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
