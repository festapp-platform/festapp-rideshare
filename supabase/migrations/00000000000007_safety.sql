-- Safety: user blocks, reports, admin moderation, platform stats, pg_cron jobs
-- Squashed from migrations 030, 031

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
-- 3. is_admin() helper function
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  );
$$;

-- ============================================================
-- 4. RLS policies — reports
-- ============================================================
CREATE POLICY "Users can insert own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view own reports or admin sees all"
  ON public.reports FOR SELECT TO authenticated
  USING (
    reporter_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Admin can update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 5. RLS policies — user blocks
-- ============================================================
CREATE POLICY "Users can manage own blocks"
  ON public.user_blocks FOR ALL TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- ============================================================
-- 6. report_user RPC
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
-- 7. block_user / unblock_user / get_blocked_users RPCs
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
-- 8. Moderation actions table
-- ============================================================
CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('warning', 'suspension', 'ban', 'unban', 'unsuspend')),
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mod_actions_user ON public.moderation_actions(user_id, created_at DESC);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. Platform stats daily table
-- ============================================================
CREATE TABLE public.platform_stats_daily (
  date DATE PRIMARY KEY,
  total_users INT NOT NULL DEFAULT 0,
  new_users INT NOT NULL DEFAULT 0,
  total_rides INT NOT NULL DEFAULT 0,
  new_rides INT NOT NULL DEFAULT 0,
  total_bookings INT NOT NULL DEFAULT 0,
  new_bookings INT NOT NULL DEFAULT 0,
  active_reports INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_stats_daily ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. RLS policies — moderation actions & platform stats
-- ============================================================
CREATE POLICY "Admin can manage moderation actions"
  ON public.moderation_actions FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can view own moderation actions"
  ON public.moderation_actions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can view platform stats"
  ON public.platform_stats_daily FOR SELECT TO authenticated
  USING (public.is_admin());

-- Admin read access on notification/email logs
CREATE POLICY "Admin can view notification logs"
  ON public.log_notifications FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin can view email logs"
  ON public.log_emails FOR SELECT TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 11. Admin RPCs
-- ============================================================

-- admin_warn_user
CREATE OR REPLACE FUNCTION public.admin_warn_user(
  p_user_id UUID,
  p_reason TEXT,
  p_report_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_action_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  INSERT INTO public.moderation_actions (user_id, admin_id, action_type, reason, report_id)
  VALUES (p_user_id, auth.uid(), 'warning', p_reason, p_report_id)
  RETURNING id INTO v_action_id;

  -- Notify the warned user
  PERFORM public._notify(
    p_user_id,
    'moderation_warning',
    'Account Warning',
    'You have received a warning from the moderation team. Please review our community guidelines.',
    jsonb_build_object('action_id', v_action_id::text)
  );

  RETURN v_action_id;
END;
$$;

-- admin_suspend_user
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_user_id UUID,
  p_reason TEXT,
  p_duration_days INT,
  p_report_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_action_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  v_expires_at := now() + (p_duration_days || ' days')::interval;

  -- Update profile status
  UPDATE public.profiles
  SET account_status = 'suspended',
      suspended_until = v_expires_at
  WHERE id = p_user_id;

  INSERT INTO public.moderation_actions (user_id, admin_id, action_type, reason, expires_at, report_id)
  VALUES (p_user_id, auth.uid(), 'suspension', p_reason, v_expires_at, p_report_id)
  RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$;

-- admin_ban_user
CREATE OR REPLACE FUNCTION public.admin_ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_cancel_rides BOOLEAN DEFAULT false,
  p_report_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_action_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Update profile status
  UPDATE public.profiles
  SET account_status = 'banned',
      suspended_until = NULL
  WHERE id = p_user_id;

  -- Optionally cancel upcoming rides and their bookings
  IF p_cancel_rides THEN
    -- Cancel all bookings on user's upcoming rides
    UPDATE public.bookings
    SET status = 'cancelled',
        cancelled_by = auth.uid(),
        cancellation_reason = 'User banned by moderation',
        cancelled_at = now(),
        updated_at = now()
    WHERE ride_id IN (
      SELECT id FROM public.rides
      WHERE driver_id = p_user_id AND status = 'upcoming'
    )
    AND status IN ('pending', 'confirmed');

    -- Cancel user's upcoming rides
    UPDATE public.rides
    SET status = 'cancelled', updated_at = now()
    WHERE driver_id = p_user_id AND status = 'upcoming';

    -- Cancel user's active bookings as passenger
    UPDATE public.bookings
    SET status = 'cancelled',
        cancelled_by = auth.uid(),
        cancellation_reason = 'User banned by moderation',
        cancelled_at = now(),
        updated_at = now()
    WHERE passenger_id = p_user_id
      AND status IN ('pending', 'confirmed');
  END IF;

  INSERT INTO public.moderation_actions (user_id, admin_id, action_type, reason, report_id)
  VALUES (p_user_id, auth.uid(), 'ban', p_reason, p_report_id)
  RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$;

-- admin_unban_user
CREATE OR REPLACE FUNCTION public.admin_unban_user(
  p_user_id UUID,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_action_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.profiles
  SET account_status = 'active',
      suspended_until = NULL
  WHERE id = p_user_id;

  INSERT INTO public.moderation_actions (user_id, admin_id, action_type, reason)
  VALUES (p_user_id, auth.uid(), 'unban', p_reason)
  RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$;

-- admin_resolve_report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_status NOT IN ('resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Status must be resolved or dismissed';
  END IF;

  UPDATE public.reports
  SET status = p_status,
      admin_notes = p_admin_notes,
      resolved_by = auth.uid(),
      resolved_at = now()
  WHERE id = p_report_id;
END;
$$;

-- admin_hide_review
CREATE OR REPLACE FUNCTION public.admin_hide_review(p_review_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_reviewee_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Get reviewee before hiding
  SELECT reviewee_id INTO v_reviewee_id
  FROM public.reviews WHERE id = p_review_id;

  -- Hide the review
  UPDATE public.reviews
  SET revealed_at = NULL
  WHERE id = p_review_id;

  -- Recalculate rating for reviewee
  UPDATE public.profiles
  SET
    rating_avg = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.reviews
      WHERE reviewee_id = v_reviewee_id AND revealed_at IS NOT NULL
    ), 0),
    rating_count = (
      SELECT COUNT(*)::int
      FROM public.reviews
      WHERE reviewee_id = v_reviewee_id AND revealed_at IS NOT NULL
    )
  WHERE id = v_reviewee_id;
END;
$$;

-- admin_delete_review
CREATE OR REPLACE FUNCTION public.admin_delete_review(p_review_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_reviewee_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Get reviewee before deleting
  SELECT reviewee_id INTO v_reviewee_id
  FROM public.reviews WHERE id = p_review_id;

  -- Delete the review
  DELETE FROM public.reviews WHERE id = p_review_id;

  -- Recalculate rating for reviewee
  UPDATE public.profiles
  SET
    rating_avg = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.reviews
      WHERE reviewee_id = v_reviewee_id AND revealed_at IS NOT NULL
    ), 0),
    rating_count = (
      SELECT COUNT(*)::int
      FROM public.reviews
      WHERE reviewee_id = v_reviewee_id AND revealed_at IS NOT NULL
    )
  WHERE id = v_reviewee_id;
END;
$$;

-- ============================================================
-- 12. Admin notification trigger on new reports
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_admins_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_reporter_name TEXT;
  v_reported_name TEXT;
  v_admin RECORD;
BEGIN
  -- Get reporter and reported user names
  SELECT display_name INTO v_reporter_name
  FROM public.profiles WHERE id = NEW.reporter_id;

  SELECT display_name INTO v_reported_name
  FROM public.profiles WHERE id = NEW.reported_user_id;

  -- Notify all admin users
  FOR v_admin IN
    SELECT id FROM auth.users
    WHERE (raw_app_meta_data ->> 'is_admin')::boolean = true
  LOOP
    PERFORM public._notify(
      v_admin.id,
      'new_report',
      'New User Report',
      COALESCE(v_reporter_name, 'A user') || ' reported ' || COALESCE(v_reported_name, 'a user'),
      jsonb_build_object('report_id', NEW.id::text)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_report_notify_admins
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_report();

-- ============================================================
-- 13. pg_cron jobs
-- ============================================================

-- Daily platform stats snapshot (1 AM)
SELECT cron.schedule(
  'daily-platform-stats',
  '0 1 * * *',
  $$
  INSERT INTO public.platform_stats_daily (date, total_users, new_users, total_rides, new_rides, total_bookings, new_bookings, active_reports)
  VALUES (
    CURRENT_DATE - 1,
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE),
    (SELECT COUNT(*) FROM public.rides),
    (SELECT COUNT(*) FROM public.rides WHERE created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE),
    (SELECT COUNT(*) FROM public.bookings),
    (SELECT COUNT(*) FROM public.bookings WHERE created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE),
    (SELECT COUNT(*) FROM public.reports WHERE status IN ('open', 'reviewing'))
  )
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    new_users = EXCLUDED.new_users,
    total_rides = EXCLUDED.total_rides,
    new_rides = EXCLUDED.new_rides,
    total_bookings = EXCLUDED.total_bookings,
    new_bookings = EXCLUDED.new_bookings,
    active_reports = EXCLUDED.active_reports;
  $$
);

-- Expire suspensions (every 15 minutes)
SELECT cron.schedule(
  'expire-suspensions',
  '*/15 * * * *',
  $$UPDATE public.profiles SET account_status = 'active', suspended_until = NULL WHERE account_status = 'suspended' AND suspended_until < now()$$
);
