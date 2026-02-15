-- Route alert trigger: fires on new ride INSERT, calls check-route-alerts Edge Function
-- Also adds an RPC for geospatial matching of rides against alert-enabled favorite routes

-- ============================================================
-- RPC: find favorite routes matching a ride's origin/destination (20km radius)
-- Called by check-route-alerts Edge Function for efficient server-side matching
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_matching_route_alerts(
  p_ride_id UUID,
  p_driver_id UUID
)
RETURNS TABLE (user_id UUID)
SET search_path = ''
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT fr.user_id
  FROM public.favorite_routes fr
  JOIN public.rides r ON r.id = p_ride_id
  WHERE fr.alert_enabled = true
    AND fr.user_id != p_driver_id
    AND extensions.ST_DWithin(
      fr.origin_location,
      r.origin_location,
      20000  -- 20km radius
    )
    AND extensions.ST_DWithin(
      fr.destination_location,
      r.destination_location,
      20000  -- 20km radius
    );
$$;

-- ============================================================
-- Trigger function: call check-route-alerts via pg_net on new ride
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_new_ride()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  -- Only check alerts for upcoming rides (not expired/cancelled)
  IF NEW.status = 'upcoming' THEN
    v_url := current_setting('supabase.service_url', true);
    v_key := current_setting('supabase.service_role_key', true);

    -- Fallback: use hardcoded project URL if setting not available
    IF v_url IS NULL OR v_url = '' THEN
      v_url := 'https://xamctptqmpruhovhjcgm.supabase.co';
    END IF;

    -- Cannot call without service_role key
    IF v_key IS NULL OR v_key = '' THEN
      RAISE WARNING 'supabase.service_role_key not available, skipping route alert check';
      RETURN NEW;
    END IF;

    PERFORM extensions.net.http_post(
      url := v_url || '/functions/v1/check-route-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object('ride_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- Create trigger on rides table
-- ============================================================
CREATE TRIGGER on_new_ride_check_alerts
  AFTER INSERT ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_ride();
