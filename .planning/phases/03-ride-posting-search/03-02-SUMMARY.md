---
phase: 03-ride-posting-search
plan: 02
subsystem: shared
tags: [zod, validation, supabase, postgis, pricing, typescript, query-builders]

# Dependency graph
requires:
  - phase: 02-profiles-identity
    provides: profiles and vehicles database types in shared package
  - phase: 03-01
    provides: rides, ride_waypoints, recurring_ride_patterns, favorite_routes DB tables and nearby_rides RPC
provides:
  - Zod validation schemas for ride creation, update, and search (LocationSchema, CreateRideSchema, UpdateRideSchema, SearchRidesSchema)
  - Czech pricing constants and calculateSuggestedPrice function (CZK)
  - Ride status, booking mode, luggage size constants matching DB constraints
  - Database types for all Phase 3 tables (rides, ride_waypoints, recurring_ride_patterns, favorite_routes)
  - nearby_rides RPC function type signature
  - Typed Supabase query builders for ride CRUD and geospatial search
affects: [03-ride-posting-search, 04-booking-messaging]

# Tech tracking
tech-stack:
  added: ["@supabase/supabase-js (shared package dependency for typed query builders)"]
  patterns: ["Query builder pattern: functions take SupabaseClient<Database> as first arg", "Zod schema + inferred type co-export pattern"]

key-files:
  created:
    - packages/shared/src/validation/ride.ts
    - packages/shared/src/validation/search.ts
    - packages/shared/src/constants/pricing.ts
    - packages/shared/src/constants/ride.ts
    - packages/shared/src/queries/rides.ts
    - packages/shared/src/queries/search.ts
  modified:
    - packages/shared/src/types/database.ts
    - packages/shared/src/index.ts
    - packages/shared/package.json

key-decisions:
  - "Added @supabase/supabase-js to shared package for typed query builders (SupabaseClient<Database> pattern)"
  - "PostGIS geography columns typed as unknown (opaque binary format not directly usable in TS)"
  - "NearbyRideResult type derived from Database Functions type rather than manual interface"

patterns-established:
  - "Query builder pattern: all DB queries are functions in packages/shared/src/queries/ that take typed SupabaseClient as first arg"
  - "Zod schemas export both schema and inferred type from same file, re-exported from index.ts"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 3 Plan 2: Shared Ride Types Summary

**Zod ride/search validation schemas, CZK pricing logic, and typed Supabase query builders for ride CRUD and PostGIS search**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T17:30:02Z
- **Completed:** 2026-02-15T17:32:42Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Complete Zod validation schemas for ride creation, update, and search with type inference
- Czech fuel-cost-based pricing function (calculateSuggestedPrice) returning suggested/min/max CZK values
- Database types for all 4 new Phase 3 tables plus nearby_rides RPC function signature
- Typed query builders for ride CRUD operations and geospatial search via PostGIS RPC

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ride validation schemas, pricing constants, and ride status constants** - `499f171` (feat)
2. **Task 2: Update database types and create query builders, then re-export from shared index** - `2bc9a3e` (feat)

## Files Created/Modified
- `packages/shared/src/validation/ride.ts` - LocationSchema, CreateRideSchema, UpdateRideSchema with Zod
- `packages/shared/src/validation/search.ts` - SearchRidesSchema for search input validation
- `packages/shared/src/constants/pricing.ts` - PRICING object and calculateSuggestedPrice function
- `packages/shared/src/constants/ride.ts` - RIDE_STATUS, BOOKING_MODE, LUGGAGE_SIZE, seat/radius constants
- `packages/shared/src/queries/rides.ts` - getRideById, getDriverRides, createRide, updateRide, deleteRide, getRideWaypoints
- `packages/shared/src/queries/search.ts` - searchNearbyRides RPC wrapper, SearchParams, NearbyRideResult types
- `packages/shared/src/types/database.ts` - Extended with rides, ride_waypoints, recurring_ride_patterns, favorite_routes, nearby_rides
- `packages/shared/src/index.ts` - Re-exports all new schemas, constants, types, and query builders
- `packages/shared/package.json` - Added @supabase/supabase-js dependency

## Decisions Made
- Added @supabase/supabase-js to shared package so query builders can accept typed SupabaseClient<Database> -- same version (^2.95.3) as web app
- PostGIS geography columns (origin_location, destination_location, route_geometry) typed as `unknown` since they are opaque binary in JS/TS
- NearbyRideResult type derived from Database['public']['Functions']['nearby_rides']['Returns'][number] for single source of truth

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @supabase/supabase-js to shared package**
- **Found during:** Task 2 (query builders)
- **Issue:** Query builders need SupabaseClient<Database> type but shared package had no supabase-js dependency
- **Fix:** `pnpm add @supabase/supabase-js@^2.95.3` in packages/shared
- **Files modified:** packages/shared/package.json, pnpm-lock.yaml
- **Verification:** Full monorepo typecheck passes
- **Committed in:** 2bc9a3e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required dependency for typed query builders. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All validation schemas, pricing logic, and query builders ready for ride posting UI (03-03)
- Database types ready for any package that imports @festapp/shared
- Query builders ready for both SSR (Next.js server components) and client-side use

---
*Phase: 03-ride-posting-search*
*Completed: 2026-02-15*
