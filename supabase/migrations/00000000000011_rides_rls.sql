-- RLS policies for rides, ride_waypoints, recurring_ride_patterns, favorite_routes

-- ============================================================
-- rides: public read for search, driver-only write
-- ============================================================
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all rides"
  ON public.rides FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Drivers can insert their own rides"
  ON public.rides FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own rides"
  ON public.rides FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can delete their own rides"
  ON public.rides FOR DELETE TO authenticated
  USING (driver_id = auth.uid());

-- ============================================================
-- ride_waypoints: public read, driver-of-parent-ride write
-- ============================================================
ALTER TABLE public.ride_waypoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all waypoints"
  ON public.ride_waypoints FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Ride driver can insert waypoints"
  ON public.ride_waypoints FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rides
      WHERE rides.id = ride_id AND rides.driver_id = auth.uid()
    )
  );

CREATE POLICY "Ride driver can update waypoints"
  ON public.ride_waypoints FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides
      WHERE rides.id = ride_id AND rides.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rides
      WHERE rides.id = ride_id AND rides.driver_id = auth.uid()
    )
  );

CREATE POLICY "Ride driver can delete waypoints"
  ON public.ride_waypoints FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides
      WHERE rides.id = ride_id AND rides.driver_id = auth.uid()
    )
  );

-- ============================================================
-- recurring_ride_patterns: driver-only access
-- ============================================================
ALTER TABLE public.recurring_ride_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage their own recurring patterns"
  ON public.recurring_ride_patterns FOR ALL TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- ============================================================
-- favorite_routes: user-only access
-- ============================================================
ALTER TABLE public.favorite_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorite routes"
  ON public.favorite_routes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
