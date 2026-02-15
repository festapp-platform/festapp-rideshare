-- Booking RPC functions: all mutations go through SECURITY DEFINER functions
-- to guarantee atomic seat management and prevent race conditions

-- ============================================================
-- 1. book_ride_instant: instant booking with atomic seat decrement
-- ============================================================
CREATE OR REPLACE FUNCTION public.book_ride_instant(
  p_ride_id UUID,
  p_passenger_id UUID,
  p_seats INT DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_booking_id UUID;
  v_available INT;
  v_driver_id UUID;
  v_booking_mode TEXT;
  v_status TEXT;
BEGIN
  -- Lock the ride row to prevent concurrent modifications
  SELECT seats_available, driver_id, booking_mode, status
  INTO v_available, v_driver_id, v_booking_mode, v_status
  FROM public.rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF v_status != 'upcoming' THEN
    RAISE EXCEPTION 'Ride is not available for booking';
  END IF;

  IF v_booking_mode != 'instant' THEN
    RAISE EXCEPTION 'Ride requires request approval';
  END IF;

  IF v_driver_id = p_passenger_id THEN
    RAISE EXCEPTION 'Driver cannot book own ride';
  END IF;

  IF v_available < p_seats THEN
    RAISE EXCEPTION 'Not enough seats available';
  END IF;

  -- Check for existing active booking
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE ride_id = p_ride_id AND passenger_id = p_passenger_id
    AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'Already booked on this ride';
  END IF;

  -- Create booking as confirmed (instant)
  INSERT INTO public.bookings (ride_id, passenger_id, seats_booked, status)
  VALUES (p_ride_id, p_passenger_id, p_seats, 'confirmed')
  RETURNING id INTO v_booking_id;

  -- Decrement available seats
  UPDATE public.rides
  SET seats_available = seats_available - p_seats
  WHERE id = p_ride_id;

  RETURN v_booking_id;
END;
$$;

-- ============================================================
-- 2. request_ride_booking: creates pending booking (no seat decrement)
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_ride_booking(
  p_ride_id UUID,
  p_passenger_id UUID,
  p_seats INT DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_booking_id UUID;
  v_available INT;
  v_driver_id UUID;
  v_status TEXT;
BEGIN
  SELECT seats_available, driver_id, status
  INTO v_available, v_driver_id, v_status
  FROM public.rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF v_status != 'upcoming' THEN
    RAISE EXCEPTION 'Ride is not available for booking';
  END IF;

  IF v_driver_id = p_passenger_id THEN
    RAISE EXCEPTION 'Driver cannot book own ride';
  END IF;

  IF v_available < p_seats THEN
    RAISE EXCEPTION 'Not enough seats available';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE ride_id = p_ride_id AND passenger_id = p_passenger_id
    AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'Already requested this ride';
  END IF;

  INSERT INTO public.bookings (ride_id, passenger_id, seats_booked, status)
  VALUES (p_ride_id, p_passenger_id, p_seats, 'pending')
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

-- ============================================================
-- 3. respond_to_booking: driver accepts or rejects a pending booking
-- ============================================================
CREATE OR REPLACE FUNCTION public.respond_to_booking(
  p_booking_id UUID,
  p_driver_id UUID,
  p_accept BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_ride_id UUID;
  v_seats INT;
  v_available INT;
  v_booking_status TEXT;
  v_ride_driver UUID;
BEGIN
  -- Lock both booking and ride rows
  SELECT b.ride_id, b.seats_booked, b.status, r.driver_id, r.seats_available
  INTO v_ride_id, v_seats, v_booking_status, v_ride_driver, v_available
  FROM public.bookings b
  JOIN public.rides r ON r.id = b.ride_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b, r;

  IF v_ride_driver != p_driver_id THEN
    RAISE EXCEPTION 'Only the driver can respond to booking requests';
  END IF;

  IF v_booking_status != 'pending' THEN
    RAISE EXCEPTION 'Booking is not pending';
  END IF;

  IF p_accept THEN
    IF v_available < v_seats THEN
      RAISE EXCEPTION 'Not enough seats available';
    END IF;

    UPDATE public.bookings SET status = 'confirmed', updated_at = now()
    WHERE id = p_booking_id;

    UPDATE public.rides SET seats_available = seats_available - v_seats
    WHERE id = v_ride_id;
  ELSE
    UPDATE public.bookings SET status = 'cancelled', cancelled_by = p_driver_id,
      cancellation_reason = 'Request rejected by driver', cancelled_at = now(),
      updated_at = now()
    WHERE id = p_booking_id;
  END IF;
END;
$$;

-- ============================================================
-- 4. cancel_booking: cancel by driver or passenger, restore seats if confirmed
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_ride_id UUID;
  v_seats INT;
  v_passenger_id UUID;
  v_driver_id UUID;
  v_status TEXT;
BEGIN
  SELECT b.ride_id, b.seats_booked, b.passenger_id, b.status, r.driver_id
  INTO v_ride_id, v_seats, v_passenger_id, v_driver_id, v_status
  FROM public.bookings b
  JOIN public.rides r ON r.id = b.ride_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b, r;

  -- Only driver or passenger can cancel
  IF p_user_id != v_passenger_id AND p_user_id != v_driver_id THEN
    RAISE EXCEPTION 'Not authorized to cancel this booking';
  END IF;

  IF v_status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled';
  END IF;

  -- Cancel the booking
  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_by = p_user_id,
      cancellation_reason = p_reason,
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_booking_id;

  -- Restore seats only if booking was confirmed (pending bookings don't hold seats)
  IF v_status = 'confirmed' THEN
    UPDATE public.rides
    SET seats_available = seats_available + v_seats
    WHERE id = v_ride_id;
  END IF;
END;
$$;

-- ============================================================
-- 5. cancel_ride: cancel ride and cascade to all bookings
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_ride(
  p_ride_id UUID,
  p_driver_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Verify ownership and upcoming status
  IF NOT EXISTS (
    SELECT 1 FROM public.rides
    WHERE id = p_ride_id AND driver_id = p_driver_id AND status = 'upcoming'
  ) THEN
    RAISE EXCEPTION 'Cannot cancel this ride';
  END IF;

  -- Cancel the ride
  UPDATE public.rides SET status = 'cancelled', updated_at = now()
  WHERE id = p_ride_id;

  -- Cancel all associated bookings
  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_by = p_driver_id,
      cancellation_reason = COALESCE(p_reason, 'Ride cancelled by driver'),
      cancelled_at = now(),
      updated_at = now()
  WHERE ride_id = p_ride_id AND status IN ('pending', 'confirmed');
END;
$$;

-- ============================================================
-- 6. complete_ride: complete ride and transition bookings
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_ride(
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

  IF v_driver != p_driver_id THEN
    RAISE EXCEPTION 'Only the driver can complete a ride';
  END IF;

  IF v_status NOT IN ('upcoming', 'in_progress') THEN
    RAISE EXCEPTION 'Ride cannot be completed from current status';
  END IF;

  -- Complete the ride
  UPDATE public.rides SET status = 'completed', updated_at = now()
  WHERE id = p_ride_id;

  -- Complete all confirmed bookings
  UPDATE public.bookings SET status = 'completed', updated_at = now()
  WHERE ride_id = p_ride_id AND status = 'confirmed';

  -- Cancel any remaining pending bookings
  UPDATE public.bookings
  SET status = 'cancelled',
      cancellation_reason = 'Ride completed',
      cancelled_at = now(),
      updated_at = now()
  WHERE ride_id = p_ride_id AND status = 'pending';
END;
$$;

-- ============================================================
-- 7. Update expire_past_rides to handle bookings
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_past_rides()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_expired_ride_ids UUID[];
BEGIN
  -- Collect IDs of rides being expired
  SELECT ARRAY_AGG(id) INTO v_expired_ride_ids
  FROM public.rides
  WHERE status = 'upcoming'
    AND departure_time < now() - interval '6 hours';

  -- Update rides to completed
  UPDATE public.rides
  SET status = 'completed',
      updated_at = now()
  WHERE status = 'upcoming'
    AND departure_time < now() - interval '6 hours';

  -- Complete confirmed bookings on expired rides
  IF v_expired_ride_ids IS NOT NULL THEN
    UPDATE public.bookings
    SET status = 'completed', updated_at = now()
    WHERE ride_id = ANY(v_expired_ride_ids)
      AND status = 'confirmed';

    -- Cancel pending bookings on expired rides
    UPDATE public.bookings
    SET status = 'cancelled',
        cancellation_reason = 'Ride auto-expired',
        cancelled_at = now(),
        updated_at = now()
    WHERE ride_id = ANY(v_expired_ride_ids)
      AND status = 'pending';
  END IF;
END;
$$;
