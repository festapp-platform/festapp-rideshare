CREATE TABLE IF NOT EXISTS public._test_otp_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL,
  otp text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public._test_otp_codes ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service_role can access (secure by default)

-- Auto-cleanup: delete OTP codes older than 1 hour
CREATE OR REPLACE FUNCTION public._cleanup_old_otp_codes() RETURNS trigger AS $$
BEGIN
  DELETE FROM public._test_otp_codes WHERE created_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_old_otp_codes
  AFTER INSERT ON public._test_otp_codes
  EXECUTE FUNCTION public._cleanup_old_otp_codes();
