# Phase 4: Booking & Ride Management - Research

**Researched:** 2026-02-15
**Domain:** Ride booking system with concurrent seat management, request/approve flow, cancellation tracking, and ride lifecycle
**Confidence:** HIGH

## Summary

Phase 4 introduces the core booking system that connects passengers with drivers. The primary technical challenge is **concurrent seat booking** -- two passengers simultaneously booking the last seat on a ride must be handled atomically to prevent overbooking. This requires PostgreSQL-level transaction control via RPC functions, not client-side Supabase queries.

The phase requires a new `bookings` table linking passengers to rides, with a status enum tracking the booking lifecycle (`pending` -> `confirmed` -> `completed` / `cancelled`). The booking flow differs based on `booking_mode`: instant bookings confirm immediately with atomic seat decrement, while request-and-approve bookings create a `pending` record that the driver accepts or rejects. Cancellations by either party must track the reason and update a reliability score on the driver's profile. The existing `expire_past_rides` cron job auto-completes rides but does not handle booking state -- ride completion must also transition associated bookings.

The existing codebase already has: rides table with `booking_mode` and `seats_available` columns, ride detail page with a placeholder "Book this ride (coming soon)" button, My Rides page showing driver rides only (needs passenger bookings), and the Edge Functions pattern for server-side logic.

**Primary recommendation:** Use PostgreSQL RPC functions for all booking mutations (book, accept, reject, cancel, complete) to guarantee atomic seat management and prevent race conditions. Use Supabase Realtime (Postgres Changes on the bookings table) for driver notifications of new booking requests.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.95 | Booking CRUD via RPC and queries | Already in use, typed with Database interface |
| PostgreSQL RPC functions | N/A | Atomic booking transactions | Only way to guarantee no race conditions on seat counts |
| zod | ^4.3 | Booking validation schemas | Already in use in shared package for all validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | already installed | Date formatting for ride history | Already used across ride-detail and my-rides pages |
| react-hook-form | ^7.54 | Cancellation reason form | Already in use for ride posting form |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL RPC for booking | Client-side UPDATE on rides | Race conditions on concurrent bookings -- NOT acceptable |
| Supabase Realtime for booking notifications | Polling | Polling wastes bandwidth and adds latency; Realtime is already in the stack |
| Separate `bookings` table | JSONB array on rides table | JSONB prevents proper RLS, indexing, and foreign key constraints -- NOT acceptable |

**Installation:**
No new packages needed. All required libraries are already installed.

## Architecture Patterns

### New Database Schema

```sql
-- Bookings table: links passengers to rides
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

  -- Cancellation tracking
  cancelled_by UUID REFERENCES public.profiles(id),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate bookings
  UNIQUE (ride_id, passenger_id)
);
```

### Pattern 1: Atomic Instant Booking via RPC

**What:** A PostgreSQL function that atomically checks seat availability, decrements `seats_available`, and creates a booking record -- all in one transaction.
**When to use:** Every instant booking must go through this function.
**Why:** Client-side queries cannot guarantee atomicity. Two users booking simultaneously could both see 1 seat available and both succeed, creating an overbooked ride.

```sql
-- Source: PostgreSQL advisory locks + transaction isolation
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

  -- Validate
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

  -- Check for existing booking
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
```

### Pattern 2: Request-and-Approve Booking Flow

**What:** A two-step flow where the passenger requests and the driver accepts/rejects.
**When to use:** Rides with `booking_mode = 'request'`.

```sql
-- Step 1: Passenger requests (creates pending booking, does NOT decrement seats yet)
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

-- Step 2: Driver accepts (atomically confirms and decrements seats)
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
  -- Get booking details
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
```

### Pattern 3: Cancellation with Seat Restoration

**What:** Cancellation by either party restores seats and tracks the cancellation for reliability scoring.
**When to use:** Any booking cancellation.

```sql
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
```

### Pattern 4: Ride Completion Flow

**What:** Driver marks ride as completed, transitioning all confirmed bookings to `completed` status.
**When to use:** After the ride is done, before rating prompt.

```sql
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
```

### Pattern 5: RLS Policies for Bookings

**What:** Row-level security ensuring passengers see their own bookings and drivers see bookings on their rides.

```sql
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Passengers can see their own bookings
CREATE POLICY "Passengers can view their own bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (
    passenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.rides WHERE rides.id = ride_id AND rides.driver_id = auth.uid()
    )
  );

-- No direct INSERT/UPDATE/DELETE -- all mutations go through RPC functions
-- RPC functions use SECURITY DEFINER to bypass RLS
```

### Pattern 6: Reliability Score Calculation

**What:** PROF-06 requires showing driver reliability on their profile. Compute from bookings data.

```sql
-- RPC function to get driver reliability stats
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
```

### Recommended Project Structure

```
supabase/migrations/
├── 00000000000014_bookings.sql           # bookings table + indexes
├── 00000000000015_bookings_rls.sql       # RLS policies
├── 00000000000016_booking_rpcs.sql       # All RPC functions (book, request, respond, cancel, complete)
├── 00000000000017_reliability_score.sql  # Reliability score RPC + profile updates

packages/shared/src/
├── constants/booking.ts                   # BOOKING_STATUS enum
├── validation/booking.ts                  # Zod schemas for booking inputs
├── queries/bookings.ts                    # Query builders for booking reads
├── index.ts                               # Re-export new modules

apps/web/app/(app)/
├── components/
│   ├── booking-button.tsx                 # Instant book / Request seat button
│   ├── booking-request-card.tsx           # Driver's view of pending requests
│   ├── passenger-list.tsx                 # List of passengers on a ride
│   ├── cancellation-dialog.tsx            # Cancel with reason modal
│   └── reliability-badge.tsx              # Driver reliability score display
├── rides/[id]/page.tsx                    # Updated: show booking action + passengers
├── my-rides/page.tsx                      # Updated: show both driver + passenger rides
```

### Anti-Patterns to Avoid

- **Client-side seat decrement:** Never update `seats_available` from the client. Always use RPC. Two clients reading the same value and both decrementing leads to overbooking.
- **Polling for booking updates:** Use Supabase Realtime (Postgres Changes on bookings table filtered by ride_id) for the driver to see new requests in real-time.
- **Storing booking state in ride's JSONB field:** Prevents proper RLS, breaks referential integrity, and makes queries inefficient.
- **Allowing direct booking table mutations via PostgREST:** All booking writes must go through SECURITY DEFINER RPC functions to maintain data integrity. No INSERT/UPDATE/DELETE policies on bookings table.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrent seat booking | Client-side check-then-update | PostgreSQL `SELECT ... FOR UPDATE` in RPC function | Race conditions are guaranteed without DB-level locking |
| Booking status state machine | Client-side status validation | PostgreSQL CHECK constraints + RPC guards | Server-side enforcement is the only trustworthy approach |
| Seat count synchronization | Manual increment/decrement tracking | Computed from bookings or atomic RPC operations | Manual tracking drifts out of sync with actual bookings |
| Notification of booking events | Custom WebSocket server | Supabase Realtime Postgres Changes on bookings table | Already available, handles reconnection and auth |

**Key insight:** Booking systems are fundamentally about concurrent state management. Every mutation that touches seat counts or booking status must be atomic and server-authoritative. The client should never be trusted to maintain booking invariants.

## Common Pitfalls

### Pitfall 1: Race Condition on Last Seat
**What goes wrong:** Two passengers simultaneously book the last seat. Both see `seats_available = 1`, both decrement, ride ends up at `seats_available = -1` with 2 confirmed bookings.
**Why it happens:** Client-side Supabase queries are not atomic. The read and write are separate operations.
**How to avoid:** Use `SELECT ... FOR UPDATE` in a PostgreSQL function to lock the ride row during the entire booking transaction.
**Warning signs:** `seats_available` going negative; more confirmed bookings than `seats_total`.

### Pitfall 2: Stale Seat Count Display
**What goes wrong:** The ride detail page shows "3 seats available" but by the time the user clicks "Book", only 1 seat is left.
**Why it happens:** The seat count was fetched when the page loaded and not refreshed.
**How to avoid:** Validate seat availability server-side in the RPC function (already handled by Pattern 1). Show a clear error message when booking fails due to insufficient seats. Optionally use Supabase Realtime to update seat count live.

### Pitfall 3: Orphaned Bookings on Ride Cancellation
**What goes wrong:** Driver cancels a ride but forgets to cancel all associated bookings. Passengers still see the ride as "upcoming" in their My Rides.
**Why it happens:** Ride cancellation and booking cancellation are separate operations.
**How to avoid:** When a ride is cancelled, use a database trigger or RPC function to automatically cancel all associated bookings and restore no seats (since the ride itself is cancelled). Update the existing `handleCancel` in ride-detail.tsx to use an RPC function that handles both.

### Pitfall 4: Reliability Score Gaming
**What goes wrong:** Driver creates rides, gets bookings, then cancels -- or passengers spam cancellations to lower a driver's score.
**Why it happens:** The cancellation tracking doesn't distinguish between legitimate and abusive cancellations.
**How to avoid:** Track `cancelled_by` to distinguish driver vs passenger cancellations. Only count driver-initiated cancellations of confirmed bookings for reliability scoring. Potentially exclude cancellations made >24h before departure.

### Pitfall 5: expire_past_rides Cron Not Handling Bookings
**What goes wrong:** The existing `expire_past_rides()` cron job sets rides to `completed` but doesn't touch the bookings table. Bookings remain in `confirmed` status forever.
**Why it happens:** The cron was created before the bookings table exists.
**How to avoid:** Update `expire_past_rides()` to also complete all confirmed bookings when a ride is auto-expired. Cancel any pending bookings.

### Pitfall 6: My Rides Page Performance
**What goes wrong:** The My Rides page loads slowly because it needs to query both rides (as driver) and bookings (as passenger) with joined ride data.
**Why it happens:** Two separate queries or a complex union query.
**How to avoid:** Create an RPC function or database view that returns a unified "my rides" list combining driver rides and passenger bookings, ordered by departure time.

## Code Examples

### Booking Button Component Pattern

```typescript
// Source: Existing ride-detail.tsx pattern
// Replace the placeholder "Book this ride (coming soon)" button

async function handleInstantBook(rideId: string, seats: number) {
  const { data, error } = await supabase.rpc('book_ride_instant', {
    p_ride_id: rideId,
    p_passenger_id: user.id,
    p_seats: seats,
  });

  if (error) {
    // Handle specific errors
    if (error.message.includes('Not enough seats')) {
      toast.error('Not enough seats available');
    } else if (error.message.includes('Already booked')) {
      toast.error('You already have a booking on this ride');
    } else {
      toast.error('Booking failed. Please try again.');
    }
    return;
  }

  // Success - refresh page to show updated state
  router.refresh();
}
```

### My Rides Query for Passenger Bookings

```typescript
// Source: Existing getDriverRides pattern in packages/shared/src/queries/rides.ts

/** Fetch rides where user is a passenger (via bookings). */
export function getPassengerBookings(
  client: SupabaseClient<Database>,
  passengerId: string,
) {
  return client
    .from('bookings')
    .select(`
      *,
      rides:ride_id(
        id, origin_address, destination_address, departure_time,
        seats_total, seats_available, price_czk, status, driver_id,
        profiles:driver_id(display_name, avatar_url, rating_avg)
      )
    `)
    .eq('passenger_id', passengerId)
    .order('created_at', { ascending: false });
}
```

### Booking Validation Schema

```typescript
// Source: Existing validation pattern in packages/shared/src/validation/ride.ts
import { z } from 'zod';

export const BOOKING_STATUS = {
  pending: 'pending',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
  completed: 'completed',
} as const;

export const BookSeatSchema = z.object({
  rideId: z.string().uuid(),
  seats: z.number().int().min(1).max(8),
});

export const CancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export type BookSeat = z.infer<typeof BookSeatSchema>;
export type CancelBooking = z.infer<typeof CancelBookingSchema>;
```

### Cancellation Ride RPC (replaces current client-side ride cancel)

```sql
-- Replace current handleCancel in ride-detail.tsx which does a direct update
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
  -- Verify ownership
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
```

## Existing Code That Needs Modification

### 1. ride-detail.tsx - Booking Section (lines 331-361)
The placeholder "Book this ride (coming soon)" button must be replaced with:
- For non-owners: Instant book button OR request seat button (based on `booking_mode`)
- Seat quantity selector when `seats_available > 1`
- For owners: Passenger list with accept/reject controls for pending requests

### 2. ride-detail.tsx - handleCancel (lines 113-132)
Currently does a direct `updateRide()` call. Must be replaced with `cancel_ride` RPC that also cancels associated bookings.

### 3. my-rides/page.tsx - Entire Page (all 207 lines)
Currently only shows driver rides via `getDriverRides()`. Must be extended to:
- Add "As Driver" / "As Passenger" toggle or combined view
- Show passenger bookings with ride details and booking status
- Show booking actions (cancel booking) for passenger rides

### 4. ride-detail.tsx - Passengers Section (lines 362-371)
Currently a placeholder. Must show actual passenger list from bookings table.

### 5. database.ts - Types
Must add `bookings` table types to the Database interface.

### 6. expire_past_rides() cron job
Must be updated to also complete/cancel bookings when rides are auto-expired.

### 7. Ride detail server page (rides/[id]/page.tsx)
Must fetch bookings data alongside ride data to pass to the client component.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side booking with optimistic updates | Server-side RPC with FOR UPDATE locks | Standard practice | Prevents overbooking race conditions |
| Polling for booking status | Supabase Realtime Postgres Changes | Available since Supabase v2 | Real-time booking notifications |
| Separate notification service | Database triggers + Edge Functions | Supabase pattern | Simpler architecture, no extra services |

**Note on notifications:** Phase 4 should NOT implement push notifications (that's Phase 5). However, Phase 4 should prepare the data model to support them. The `bookings` table with status changes provides the events that Phase 5 will subscribe to. For now, in-app state changes (page refresh, Realtime subscriptions) are sufficient.

## Open Questions

1. **Seat selection granularity**
   - What we know: Passengers can book multiple seats (1-8 per the schema constraint).
   - What's unclear: Should there be a UI limit on how many seats one passenger can book? Can they book all available seats?
   - Recommendation: Allow booking up to `seats_available` seats per passenger. No artificial limit beyond ride capacity.

2. **Cancellation time limits**
   - What we know: Either party can cancel with a reason. Cancellations are tracked for reliability.
   - What's unclear: Should there be a deadline before departure after which cancellation is not allowed (or more severely penalized)?
   - Recommendation: Allow cancellation at any time but track time-to-departure at cancellation. Phase 6 (trust/ratings) can use this data for more nuanced scoring. Keep it simple for Phase 4.

3. **Ride completion timing**
   - What we know: Driver can manually complete. Cron auto-completes after 6 hours past departure.
   - What's unclear: Should the driver be able to complete a ride before departure time (e.g., if they decide not to go)?
   - Recommendation: Only allow completion after departure time. Before departure, the action should be "Cancel ride" not "Complete ride". In-progress status can be set at departure time.

4. **Booking notifications scope**
   - What we know: Phase 5 handles notifications. Phase 4 needs in-app awareness.
   - What's unclear: How much real-time functionality to build in Phase 4 vs defer to Phase 5.
   - Recommendation: Use Supabase Realtime on the ride detail page so drivers see new booking requests without refreshing. No push notifications, no email. Keep it simple.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: rides table schema (`00000000000007_rides.sql`), RLS policies (`00000000000011_rides_rls.sql`), existing queries (`packages/shared/src/queries/rides.ts`), ride detail component (`apps/web/app/(app)/components/ride-detail.tsx`), my-rides page (`apps/web/app/(app)/my-rides/page.tsx`)
- [Supabase Database Functions Docs](https://supabase.com/docs/guides/database/functions) - RPC pattern for atomic operations
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - Policy patterns for multi-party access
- PostgreSQL `SELECT ... FOR UPDATE` - standard row-level locking for concurrent access

### Secondary (MEDIUM confidence)
- [Supabase Edge Function Transactions](https://marmelab.com/blog/2025/12/08/supabase-edge-function-transaction-rls.html) - Patterns for transactional operations
- [Preventing Race Conditions with SERIALIZABLE Isolation](https://github.com/orgs/supabase/discussions/30334) - Community discussion on concurrency
- [How to Solve Race Conditions in a Booking System](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system) - General booking system patterns

### Tertiary (LOW confidence)
- [How to Handle Concurrent Writes in Supabase](https://bootstrapped.app/guide/how-to-handle-concurrent-writes-in-supabase) - Guide on concurrent writes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all patterns use existing Supabase + PostgreSQL capabilities
- Architecture: HIGH - Booking table + RPC functions is the standard pattern for concurrent booking systems on PostgreSQL
- Pitfalls: HIGH - Race conditions on concurrent bookings are well-documented; FOR UPDATE locking is the proven solution
- UI patterns: MEDIUM - Existing component patterns are clear, but the exact UX for booking flows requires design decisions

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable domain, no fast-moving library changes)
