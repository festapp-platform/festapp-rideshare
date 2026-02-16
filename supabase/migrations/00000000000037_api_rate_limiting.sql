-- API Rate Limiting (WEB-09)
-- Tracks request counts per identifier/endpoint for Edge Function rate limiting.
-- Cleaned up by cron every 15 minutes.

CREATE TABLE public.api_rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier TEXT NOT NULL,        -- IP address or user ID
  endpoint TEXT NOT NULL,          -- function name
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Index for fast lookups during rate limit checks
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
