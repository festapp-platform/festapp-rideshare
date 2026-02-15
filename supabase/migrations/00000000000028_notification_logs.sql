-- ============================================================
-- Notification/email/SMS log tables (metadata only, no content)
-- ============================================================

-- Push notification log
CREATE TABLE public.log_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,              -- booking_request, booking_confirmation, etc.
  channel TEXT NOT NULL DEFAULT 'push', -- push, in_app
  status TEXT NOT NULL DEFAULT 'sent',  -- sent, failed
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email log
CREATE TABLE public.log_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,              -- booking_confirmation, ride_reminder, booking_cancellation
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',  -- sent, failed
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SMS log (for auth OTPs and future SMS notifications)
CREATE TABLE public.log_sms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'otp', -- otp, notification
  recipient_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',  -- sent, failed
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for querying by user and time range
CREATE INDEX idx_log_notifications_user ON public.log_notifications(user_id, created_at DESC);
CREATE INDEX idx_log_emails_user ON public.log_emails(user_id, created_at DESC);
CREATE INDEX idx_log_sms_user ON public.log_sms(user_id, created_at DESC);

-- BRIN index for time-range scans (analytics)
CREATE INDEX idx_log_notifications_ts ON public.log_notifications USING brin(created_at);
CREATE INDEX idx_log_emails_ts ON public.log_emails USING brin(created_at);
CREATE INDEX idx_log_sms_ts ON public.log_sms USING brin(created_at);

-- RLS: only admins can read logs (service_role bypasses RLS for Edge Functions)
ALTER TABLE public.log_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_sms ENABLE ROW LEVEL SECURITY;

-- No user-facing policies — logs are written by service_role (Edge Functions)
-- and read by admin dashboard (future Phase 6)
