---
phase: 07-live-location
plan: 01
subsystem: database, realtime
tags: [supabase-broadcast, geolocation, rpc, plpgsql, react-hook]

# Dependency graph
requires:
  - phase: 04-booking-management
    provides: "complete_ride RPC pattern, ride status transitions"
  - phase: 05-messaging-notifications
    provides: "Broadcast channel pattern from chat typing indicators"
provides:
  - "start_ride RPC for upcoming -> in_progress transition"
  - "LocationPayload type and GPS_CONFIG constants"
  - "LOCATION_CHANNEL_PREFIX, LOCATION_BROADCAST_EVENT, LOCATION_STOPPED_EVENT"
  - "useLiveLocation hook for real-time Broadcast location sharing"
affects: [07-02, 07-03, ride-detail-ui, driver-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Supabase Broadcast for ephemeral location data", "watchPosition with Broadcast publish"]

key-files:
  created:
    - "supabase/migrations/00000000000032_live_location.sql"
    - "packages/shared/src/constants/location.ts"
    - "apps/web/app/(app)/hooks/use-live-location.ts"
  modified:
    - "packages/shared/src/types/database.ts"
    - "packages/shared/src/index.ts"

key-decisions:
  - "start_ride follows complete_ride pattern: SECURITY DEFINER, FOR UPDATE row lock, validated driver ownership"
  - "Broadcast-only location sharing (no database persistence) for ephemeral driver positions"

patterns-established:
  - "Location Broadcast: channel per ride (live-location-{rideId}), location_update and location_stopped events"
  - "GPS watchPosition with configurable GPS_CONFIG thresholds for adaptive update frequency"

# Metrics
duration: 1min
completed: 2026-02-16
---

# Phase 7 Plan 1: Live Location Foundation Summary

**start_ride RPC for ride state transition, LocationPayload constants, and useLiveLocation Broadcast hook for real-time driver GPS sharing**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-15T23:00:15Z
- **Completed:** 2026-02-15T23:01:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- start_ride RPC transitions rides from upcoming to in_progress with driver validation and row locking
- LocationPayload type, GPS_CONFIG constants, and Broadcast event names exported from shared package
- useLiveLocation hook manages Broadcast subscription and GPS watchPosition publishing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create start_ride RPC and shared location constants** - `70126dd` (feat)
2. **Task 2: Create useLiveLocation Broadcast hook** - `37b1cc6` (feat)

## Files Created/Modified
- `supabase/migrations/00000000000032_live_location.sql` - start_ride RPC (upcoming -> in_progress)
- `packages/shared/src/constants/location.ts` - LocationPayload, GPS_CONFIG, channel/event constants
- `packages/shared/src/types/database.ts` - Added start_ride to Functions interface
- `packages/shared/src/index.ts` - Exports for location constants and types
- `apps/web/app/(app)/hooks/use-live-location.ts` - Broadcast hook for live driver location

## Decisions Made
- start_ride follows complete_ride pattern: SECURITY DEFINER, FOR UPDATE row lock, validated driver ownership
- Broadcast-only location sharing (no database persistence) for ephemeral driver positions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- useLiveLocation hook ready for UI integration in 07-02 (driver sharing UI) and 07-03 (passenger map view)
- start_ride RPC available for driver "Start Ride" button integration

---
*Phase: 07-live-location*
*Completed: 2026-02-16*
