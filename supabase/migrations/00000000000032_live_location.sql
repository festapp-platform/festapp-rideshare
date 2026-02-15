-- Live location: start_ride RPC for transitioning ride to in_progress

-- ============================================================
-- start_ride: driver starts a ride (upcoming -> in_progress)
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_ride(
  p_ride_id UUID,
  p_driver_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
  v_driver UUID;
BEGIN
  SELECT status, driver_id INTO v_status, v_driver
  FROM public.rides WHERE id = p_ride_id FOR UPDATE;

  IF v_driver IS NULL THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_driver != p_driver_id THEN
    RAISE EXCEPTION 'Only the driver can start a ride';
  END IF;

  IF v_status != 'upcoming' THEN
    RAISE EXCEPTION 'Ride can only be started from upcoming status';
  END IF;

  UPDATE public.rides
  SET status = 'in_progress', updated_at = now()
  WHERE id = p_ride_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_ride(UUID, UUID) TO authenticated;
