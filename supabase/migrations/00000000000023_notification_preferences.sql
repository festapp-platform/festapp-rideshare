-- Notification preferences: per-user push/email toggles for each notification category
-- Route alerts: alert_enabled column on favorite_routes for matching ride notifications

-- ============================================================
-- notification_preferences table
-- ============================================================
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_booking_requests BOOLEAN NOT NULL DEFAULT true,
  push_booking_confirmations BOOLEAN NOT NULL DEFAULT true,
  push_booking_cancellations BOOLEAN NOT NULL DEFAULT true,
  push_new_messages BOOLEAN NOT NULL DEFAULT true,
  push_ride_reminders BOOLEAN NOT NULL DEFAULT true,
  push_route_alerts BOOLEAN NOT NULL DEFAULT true,
  email_booking_confirmations BOOLEAN NOT NULL DEFAULT true,
  email_ride_reminders BOOLEAN NOT NULL DEFAULT true,
  email_cancellations BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- updated_at trigger (reuses existing function from Phase 1)
-- ============================================================
CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS policies
-- ============================================================
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Route alerts: add alert_enabled to favorite_routes
-- ============================================================
ALTER TABLE public.favorite_routes ADD COLUMN alert_enabled BOOLEAN NOT NULL DEFAULT false;
