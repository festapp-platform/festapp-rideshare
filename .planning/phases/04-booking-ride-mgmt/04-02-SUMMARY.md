---
phase: 04-booking-ride-mgmt
plan: 02
subsystem: ui
tags: [react, next.js, supabase-rpc, booking, sonner, toast]

# Dependency graph
requires:
  - phase: 04-booking-ride-mgmt
    plan: 01
    provides: "Booking RPCs (book_ride_instant, request_ride_booking), bookings table, shared query builders"
provides:
  - "BookingButton component with seat selector for instant and request booking modes"
  - "PassengerList component showing confirmed passengers with avatars and seat counts"
  - "Ride detail page with server-side booking data fetching and booking integration"
  - "Sonner toast notification system in app layout"
affects: [04-03, 04-04, 04-05]

# Tech tracking
tech-stack:
  added: [sonner]
  patterns: [toast notifications via sonner, FK hint disambiguation in Supabase queries]

key-files:
  created:
    - apps/web/app/(app)/components/booking-button.tsx
    - apps/web/app/(app)/components/passenger-list.tsx
  modified:
    - apps/web/app/(app)/rides/[id]/page.tsx
    - apps/web/app/(app)/components/ride-detail.tsx
    - apps/web/app/(app)/layout.tsx
    - packages/shared/src/queries/bookings.ts

key-decisions:
  - "Installed sonner for toast notifications (no existing toast library in project)"
  - "Used !bookings_passenger_id_fkey hint in PostgREST select to disambiguate profiles FK (passenger_id vs cancelled_by)"

patterns-established:
  - "Toast pattern: import { toast } from 'sonner' for success/error notifications"
  - "Booking component reuse: BookingButton handles both instant and request modes via bookingMode prop"

# Metrics
duration: 5min
completed: 2026-02-15
---

# Phase 4 Plan 2: Instant Booking UI Summary

**BookingButton with seat selector and PassengerList integrated into ride detail page, with sonner toast notifications and server-side booking data fetching**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-15T18:19:40Z
- **Completed:** 2026-02-15T18:25:36Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- BookingButton component handles instant/request modes with seat selector, loading state, and specific error messages
- PassengerList component displays passengers with avatars, names, seat counts, and profile links
- Ride detail page fetches bookings server-side and passes to client components
- Driver sees confirmed + pending bookings; non-driver sees only confirmed
- Already-booked passengers see status badge instead of book button
- Toast notification system (sonner) added to app layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BookingButton and PassengerList components** - `a573f6e` (feat)
2. **Task 2: Integrate booking components into ride detail page** - `c16cf2b` (feat)

## Files Created/Modified
- `apps/web/app/(app)/components/booking-button.tsx` - Booking action button with seat selector, loading state, error handling for instant/request modes
- `apps/web/app/(app)/components/passenger-list.tsx` - Passenger list with avatars, names, seat count badges, and pending indicators
- `apps/web/app/(app)/rides/[id]/page.tsx` - Server page now fetches bookings and current user booking alongside ride data
- `apps/web/app/(app)/components/ride-detail.tsx` - Replaced placeholder booking/passengers sections with real components
- `apps/web/app/(app)/layout.tsx` - Added sonner Toaster component for toast notifications
- `packages/shared/src/queries/bookings.ts` - Fixed FK hint for profiles disambiguation

## Decisions Made
- Installed sonner for toast notifications -- lightweight, works well with Next.js, no existing toast library in project
- Used `!bookings_passenger_id_fkey` PostgREST hint to disambiguate profiles relationship (bookings has two FKs to profiles: passenger_id and cancelled_by)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed sonner toast library**
- **Found during:** Task 1 (BookingButton component)
- **Issue:** Plan calls for toast notifications but no toast library exists in the project
- **Fix:** Installed sonner, added Toaster to app layout
- **Files modified:** apps/web/package.json, pnpm-lock.yaml, apps/web/app/(app)/layout.tsx
- **Verification:** Build passes, toaster renders in layout
- **Committed in:** a573f6e (Task 1 commit)

**2. [Rule 1 - Bug] Fixed Supabase FK hint for bookings-profiles query**
- **Found during:** Task 2 (build verification)
- **Issue:** TypeScript build error: "Could not embed because more than one relationship was found for 'profiles' and 'bookings'" -- bookings has both passenger_id and cancelled_by referencing profiles
- **Fix:** Changed select from `profiles:passenger_id(...)` to `profiles!bookings_passenger_id_fkey(...)` in getBookingsForRide and getBookingById
- **Files modified:** packages/shared/src/queries/bookings.ts
- **Verification:** Build passes with correct type inference
- **Committed in:** c16cf2b (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for functionality. No scope creep.

## Issues Encountered
- Parallel agent (04-03) committed some of the 04-02 unstaged changes; Task 2 commit captures the remaining changes correctly
- Stale .next lock file required cleanup before rebuild

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- BookingButton supports both instant and request modes (request mode wired for Plan 04-03)
- PassengerList reusable for driver management views
- Toast notification infrastructure available for all future booking-related feedback

---
*Phase: 04-booking-ride-mgmt*
*Completed: 2026-02-15*
