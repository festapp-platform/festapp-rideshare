---
phase: 08-events-flexible-gamification
plan: 01
subsystem: database
tags: [events, supabase, rls, rpc, zod, postgis]

# Dependency graph
requires:
  - phase: 06-ratings-trust-safety
    provides: is_admin() helper, _notify() function, user_blocks table
provides:
  - Events table with admin approval workflow (pending/approved/rejected)
  - rides.event_id FK column for linking rides to events
  - Admin approve/reject RPCs with notification
  - get_event_rides RPC with block filtering
  - Event shared types, constants, Zod schemas, query builders
affects: [08-02-events-ui, 08-03-events-admin]

# Tech tracking
tech-stack:
  added: []
  patterns: [event-approval-workflow, event-linked-rides]

key-files:
  created:
    - supabase/migrations/00000000000033_events.sql
    - packages/shared/src/constants/event.ts
    - packages/shared/src/validation/event.ts
    - packages/shared/src/queries/events.ts
  modified:
    - packages/shared/src/types/database.ts
    - packages/shared/src/index.ts

key-decisions:
  - "get_event_rides returns empty set for non-approved events (no error) for graceful handling"
  - "Event deletion restricted to pending status only (approved events persist)"

patterns-established:
  - "Admin approval workflow: pending -> approved/rejected with _notify() to creator"
  - "Event-linked rides via nullable FK on rides table with partial index"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 8 Plan 1: Events Database & Shared Package Summary

**Events table with admin approval workflow, rides.event_id linking, admin RPCs with notification, and shared event types/schemas/queries**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T23:40:51Z
- **Completed:** 2026-02-15T23:43:56Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Events table with pending/approved/rejected status, GIST spatial index, and admin notes for rejection
- rides.event_id nullable FK with partial index for event-linked rides
- Admin approve/reject RPCs with is_admin() guard and _notify() for creator notification
- get_event_rides RPC with block filtering returning ride listings for approved events
- Shared package: event constants, Zod validation schemas, typed query builders, Database types

## Task Commits

Each task was committed atomically:

1. **Task 1: Events database migration** - `bcef8ef` (feat)
2. **Task 2: Events shared package (types, constants, schemas, queries)** - `74b3d2a` (feat)

## Files Created/Modified
- `supabase/migrations/00000000000033_events.sql` - Events table, rides.event_id, RLS, admin RPCs, get_event_rides
- `packages/shared/src/constants/event.ts` - EVENT_STATUS, name/description length limits
- `packages/shared/src/validation/event.ts` - CreateEventSchema, UpdateEventSchema with Zod
- `packages/shared/src/queries/events.ts` - Query builders for approved, by-id, my-events, pending-admin, event-rides
- `packages/shared/src/types/database.ts` - Events table types, event_id on rides, RPC function signatures, Event/EventRide derived types
- `packages/shared/src/index.ts` - All event exports added

## Decisions Made
- get_event_rides returns empty result set (not error) for non-approved events -- graceful client handling
- Event deletion restricted to own pending events only via RLS -- approved/rejected events persist for history
- Rides with event_id use ON DELETE SET NULL -- if event removed, rides survive as standalone

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added gamification RPC function signatures to Database types**
- **Found during:** Task 2 (shared package build verification)
- **Issue:** A linter/formatter had proactively added gamification tables (badge_definitions, user_achievements, route_streaks) and queries/gamification.ts referencing RPCs not yet in Database types, causing TS compilation errors
- **Fix:** The linter resolved this itself by adding get_user_impact, get_user_badges, get_route_streaks function signatures
- **Files modified:** packages/shared/src/types/database.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 74b3d2a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Linter-originated addition of future plan types. No scope creep from our execution.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Events database foundation complete, ready for UI (08-02) and admin panel (08-03)
- Shared types and query builders available for all consumers via @festapp/shared

---
*Phase: 08-events-flexible-gamification*
*Completed: 2026-02-16*
