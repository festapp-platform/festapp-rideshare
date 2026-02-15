-- Reviews table with dual-reveal mechanism, rating aggregation triggers,
-- submit_review/get_pending_reviews RPCs, completed_rides_count tracking,
-- and pg_cron job for revealing expired reviews.

-- ============================================================
-- 1. Profile columns for trust & safety
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active'
  CHECK (account_status IN ('active', 'suspended', 'banned'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS completed_rides_count INT DEFAULT 0;

-- ============================================================
-- 2. Reviews table
-- ============================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (char_length(comment) <= 500),
  revealed_at TIMESTAMPTZ,  -- NULL = hidden (dual-reveal pending)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One review per user per booking
  UNIQUE (booking_id, reviewer_id)
);

-- Indexes
CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id, revealed_at DESC)
  WHERE revealed_at IS NOT NULL;
CREATE INDEX idx_reviews_ride ON public.reviews(ride_id);
CREATE INDEX idx_reviews_booking ON public.reviews(booking_id);
CREATE INDEX idx_reviews_unrevealed ON public.reviews(created_at)
  WHERE revealed_at IS NULL;

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS policies on reviews
-- ============================================================

-- SELECT: users see revealed reviews + their own unrevealed
CREATE POLICY "Users can view revealed reviews or own unrevealed"
  ON public.reviews FOR SELECT TO authenticated
  USING (revealed_at IS NOT NULL OR reviewer_id = auth.uid());

-- INSERT: only the reviewer can insert (via RPC, but policy enforces identity)
CREATE POLICY "Users can insert own reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- No UPDATE/DELETE for regular users (immutable reviews)

-- ============================================================
-- 4. Dual-reveal trigger (check_review_reveal)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_review_reveal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_counter_review_id UUID;
BEGIN
  -- Find counter-review: same booking, reviewer is our reviewee and vice versa
  -- FOR UPDATE to prevent race condition with concurrent inserts
  SELECT id INTO v_counter_review_id
  FROM public.reviews
  WHERE booking_id = NEW.booking_id
    AND reviewer_id = NEW.reviewee_id
    AND reviewee_id = NEW.reviewer_id
    AND revealed_at IS NULL
  FOR UPDATE;

  -- If counter-review found, reveal both
  IF v_counter_review_id IS NOT NULL THEN
    UPDATE public.reviews
    SET revealed_at = now()
    WHERE id IN (NEW.id, v_counter_review_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_insert_check_reveal
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_review_reveal();

-- ============================================================
-- 5. Rating aggregation trigger (update_rating_aggregates)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_rating_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Recalculate rating_avg and rating_count for the reviewee
  UPDATE public.profiles
  SET
    rating_avg = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.reviews
      WHERE reviewee_id = NEW.reviewee_id
        AND revealed_at IS NOT NULL
    ), 0),
    rating_count = (
      SELECT COUNT(*)::int
      FROM public.reviews
      WHERE reviewee_id = NEW.reviewee_id
        AND revealed_at IS NOT NULL
    )
  WHERE id = NEW.reviewee_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_update_rating
  AFTER INSERT OR UPDATE OF revealed_at ON public.reviews
  FOR EACH ROW
  WHEN (NEW.revealed_at IS NOT NULL)
  EXECUTE FUNCTION public.update_rating_aggregates();

-- ============================================================
-- 6. Completed rides count triggers
-- ============================================================

-- Increment for passenger when booking status changes to 'completed'
CREATE OR REPLACE FUNCTION public.increment_passenger_completed_rides()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.profiles
    SET completed_rides_count = completed_rides_count + 1
    WHERE id = NEW.passenger_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_booking_completed_increment_passenger
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.increment_passenger_completed_rides();

-- Increment for driver when ride status changes to 'completed'
CREATE OR REPLACE FUNCTION public.increment_driver_completed_rides()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.profiles
    SET completed_rides_count = completed_rides_count + 1
    WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ride_completed_increment_driver
  AFTER UPDATE OF status ON public.rides
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.increment_driver_completed_rides();

-- ============================================================
-- 7. submit_review RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_review(
  p_booking_id UUID,
  p_rating INT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_booking RECORD;
  v_other_user_id UUID;
  v_review_id UUID;
  v_both_reviewed BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  -- Fetch booking with ride details
  SELECT b.id, b.ride_id, b.passenger_id, b.status, b.updated_at,
         r.driver_id
  INTO v_booking
  FROM public.bookings b
  JOIN public.rides r ON r.id = b.ride_id
  WHERE b.id = p_booking_id;

  -- Validate booking exists
  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Validate booking is completed
  IF v_booking.status != 'completed' THEN
    RAISE EXCEPTION 'Can only review completed rides';
  END IF;

  -- Validate caller is a participant
  IF v_user_id != v_booking.passenger_id AND v_user_id != v_booking.driver_id THEN
    RAISE EXCEPTION 'Not a participant in this booking';
  END IF;

  -- Validate 14-day window
  IF v_booking.updated_at < now() - interval '14 days' THEN
    RAISE EXCEPTION 'Review window has expired (14 days)';
  END IF;

  -- Validate rating range
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Validate comment length
  IF p_comment IS NOT NULL AND char_length(p_comment) > 500 THEN
    RAISE EXCEPTION 'Comment must be 500 characters or less';
  END IF;

  -- Determine other user
  IF v_user_id = v_booking.passenger_id THEN
    v_other_user_id := v_booking.driver_id;
  ELSE
    v_other_user_id := v_booking.passenger_id;
  END IF;

  -- Check for duplicate review
  IF EXISTS (
    SELECT 1 FROM public.reviews
    WHERE booking_id = p_booking_id AND reviewer_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already reviewed this booking';
  END IF;

  -- Insert review
  INSERT INTO public.reviews (booking_id, ride_id, reviewer_id, reviewee_id, rating, comment)
  VALUES (p_booking_id, v_booking.ride_id, v_user_id, v_other_user_id, p_rating, p_comment)
  RETURNING id INTO v_review_id;

  -- Check if both parties have now reviewed (counter-review exists)
  v_both_reviewed := EXISTS (
    SELECT 1 FROM public.reviews
    WHERE booking_id = p_booking_id AND reviewer_id = v_other_user_id
  );

  RETURN jsonb_build_object(
    'review_id', v_review_id,
    'both_reviewed', v_both_reviewed
  );
END;
$$;

-- ============================================================
-- 8. get_pending_reviews RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_pending_reviews()
RETURNS TABLE (
  booking_id UUID,
  ride_id UUID,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  origin_address TEXT,
  destination_address TEXT,
  ride_completed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  -- Completed bookings where auth.uid() is passenger and hasn't reviewed yet
  SELECT
    b.id AS booking_id,
    b.ride_id,
    r.driver_id AS other_user_id,
    p.display_name AS other_user_name,
    p.avatar_url AS other_user_avatar,
    r.origin_address,
    r.destination_address,
    r.updated_at AS ride_completed_at
  FROM public.bookings b
  JOIN public.rides r ON r.id = b.ride_id
  JOIN public.profiles p ON p.id = r.driver_id
  WHERE b.passenger_id = auth.uid()
    AND b.status = 'completed'
    AND r.updated_at >= now() - interval '14 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.reviews rv
      WHERE rv.booking_id = b.id AND rv.reviewer_id = auth.uid()
    )

  UNION ALL

  -- Completed rides where auth.uid() is driver and hasn't reviewed passengers
  SELECT
    b.id AS booking_id,
    b.ride_id,
    b.passenger_id AS other_user_id,
    p.display_name AS other_user_name,
    p.avatar_url AS other_user_avatar,
    r.origin_address,
    r.destination_address,
    r.updated_at AS ride_completed_at
  FROM public.rides r
  JOIN public.bookings b ON b.ride_id = r.id
  JOIN public.profiles p ON p.id = b.passenger_id
  WHERE r.driver_id = auth.uid()
    AND b.status = 'completed'
    AND r.updated_at >= now() - interval '14 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.reviews rv
      WHERE rv.booking_id = b.id AND rv.reviewer_id = auth.uid()
    )

  ORDER BY ride_completed_at DESC;
$$;

-- ============================================================
-- 9. pg_cron: reveal expired reviews (daily at 3 AM)
-- ============================================================
SELECT cron.schedule(
  'reveal-expired-reviews',
  '0 3 * * *',
  $$UPDATE public.reviews SET revealed_at = now() WHERE revealed_at IS NULL AND created_at < now() - interval '14 days'$$
);
