-- Bookings table: links passengers to rides with status lifecycle
-- Supports instant booking (confirmed immediately) and request mode (pending -> confirmed/cancelled)

-- ============================================================
-- bookings table
-- ============================================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id),
  seats_booked INT NOT NULL DEFAULT 1 CHECK (seats_booked BETWEEN 1 AND 8),

  -- Status lifecycle: pending -> confirmed -> completed/cancelled
  -- For instant booking: created as 'confirmed' directly
  -- For request mode: created as 'pending', driver accepts -> 'confirmed'
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),

  -- Cancellation tracking (for reliability scoring)
  cancelled_by UUID REFERENCES public.profiles(id),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate bookings per ride per passenger
  UNIQUE (ride_id, passenger_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_bookings_ride_id ON public.bookings(ride_id);
CREATE INDEX idx_bookings_passenger_id ON public.bookings(passenger_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- ============================================================
-- updated_at trigger (reuses existing function from Phase 1)
-- ============================================================
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS policies
-- ============================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Passengers can see their own bookings, drivers can see bookings on their rides
CREATE POLICY "Users can view own bookings or bookings on their rides"
  ON public.bookings FOR SELECT TO authenticated
  USING (
    passenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.rides
      WHERE rides.id = bookings.ride_id AND rides.driver_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies: all mutations go through SECURITY DEFINER RPCs

-- ============================================================
-- get_driver_reliability RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_driver_reliability(p_driver_id UUID)
RETURNS TABLE (
  total_rides_completed INT,
  total_rides_cancelled INT,
  cancellation_rate NUMERIC,
  total_bookings_received INT
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    COUNT(*) FILTER (WHERE r.status = 'completed')::INT AS total_rides_completed,
    COUNT(*) FILTER (
      WHERE r.status = 'cancelled'
      AND EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.ride_id = r.id AND b.cancelled_by = r.driver_id
      )
    )::INT AS total_rides_cancelled,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND(
        COUNT(*) FILTER (WHERE r.status = 'cancelled')::NUMERIC / COUNT(*)::NUMERIC,
        2
      )
    END AS cancellation_rate,
    (SELECT COUNT(*)::INT FROM public.bookings b
     JOIN public.rides r2 ON r2.id = b.ride_id
     WHERE r2.driver_id = p_driver_id AND b.status = 'confirmed'
    ) AS total_bookings_received
  FROM public.rides r
  WHERE r.driver_id = p_driver_id
    AND r.status IN ('completed', 'cancelled');
$$;
