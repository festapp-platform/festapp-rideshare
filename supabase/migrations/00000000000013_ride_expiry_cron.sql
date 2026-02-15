-- Ride expiry: automatically mark past rides as completed
-- Also: auto-generate rides from recurring patterns

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- expire_past_rides: runs hourly to complete expired rides
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_past_rides()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.rides
  SET status = 'completed',
      updated_at = now()
  WHERE status = 'upcoming'
    AND departure_time < now() - interval '6 hours';
END;
$$;

-- Schedule: run every hour at minute 0
SELECT cron.schedule(
  'expire-past-rides',
  '0 * * * *',
  $$SELECT public.expire_past_rides();$$
);

-- ============================================================
-- generate_recurring_rides: runs daily to create ride instances
-- from active recurring patterns
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_recurring_rides()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  pattern RECORD;
  target_date DATE;
  ride_exists BOOLEAN;
BEGIN
  FOR pattern IN
    SELECT * FROM public.recurring_ride_patterns WHERE is_active = true
  LOOP
    FOR i IN 0..pattern.generate_weeks_ahead LOOP
      -- Calculate the next occurrence of the pattern's day_of_week
      target_date := CURRENT_DATE + (i * 7) +
        ((pattern.day_of_week - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7);

      -- Skip past dates
      IF target_date < CURRENT_DATE THEN
        CONTINUE;
      END IF;

      -- Check if ride already exists for this date
      SELECT EXISTS (
        SELECT 1 FROM public.rides
        WHERE recurring_pattern_id = pattern.id
          AND departure_time::date = target_date
          AND status IN ('upcoming', 'in_progress')
      ) INTO ride_exists;

      IF NOT ride_exists THEN
        INSERT INTO public.rides (
          driver_id, vehicle_id,
          origin_location, origin_address,
          destination_location, destination_address,
          route_geometry, route_encoded_polyline,
          departure_time, seats_total, seats_available,
          price_czk, booking_mode, status, recurring_pattern_id
        ) VALUES (
          pattern.driver_id, pattern.vehicle_id,
          pattern.origin_location, pattern.origin_address,
          pattern.destination_location, pattern.destination_address,
          pattern.route_geometry, pattern.route_encoded_polyline,
          target_date + pattern.departure_time,
          pattern.seats_total, pattern.seats_total,
          pattern.price_czk, pattern.booking_mode, 'upcoming',
          pattern.id
        );
      END IF;
    END LOOP;

    -- Update last_generated_date
    UPDATE public.recurring_ride_patterns
    SET last_generated_date = CURRENT_DATE + (pattern.generate_weeks_ahead * 7)
    WHERE id = pattern.id;
  END LOOP;
END;
$$;

-- Schedule: run daily at 3 AM
SELECT cron.schedule(
  'generate-recurring-rides',
  '0 3 * * *',
  $$SELECT public.generate_recurring_rides();$$
);
