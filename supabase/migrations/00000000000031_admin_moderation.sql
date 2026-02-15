-- Admin moderation: moderation_actions table, is_admin() helper, admin RPCs,
-- platform_stats_daily, pg_cron jobs, RLS policies, admin notification trigger.

-- ============================================================
-- 1. is_admin() helper function
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
-- 2. Moderation actions table
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
-- 3. Platform stats daily table
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
-- 4. RLS policies
-- ============================================================

-- Moderation actions: admins see all, users see own
CREATE POLICY "Admin can manage moderation actions"
  ON public.moderation_actions FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can view own moderation actions"
  ON public.moderation_actions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Platform stats: admin only
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
-- 5. Admin RPCs
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

-- admin_hide_review (sets revealed_at = NULL to hide a review)
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
-- 6. pg_cron jobs
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

-- ============================================================
-- 7. Admin notification trigger on new reports
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
  -- Admin users have is_admin = true in auth.users raw_app_meta_data
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
