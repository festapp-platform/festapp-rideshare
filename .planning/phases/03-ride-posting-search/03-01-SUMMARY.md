---
phase: 03-ride-posting-search
plan: 01
subsystem: database
tags: [supabase, postgres, postgis, rls, geography, spatial-index, rpc, pg-cron]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: initial_setup with update_updated_at_column trigger, uuid-ossp extension
  - phase: 02-profiles-identity
    provides: profiles table, vehicles table
provides:
  - PostGIS extension enabled in extensions schema
  - Rides table with POINT/LINESTRING geography columns and GIST spatial indexes
  - Ride waypoints table for pickup/dropoff points
  - Recurring ride patterns table with weekly scheduling
  - Favorite routes table with unique constraint per user/route
  - RLS policies on all 4 new tables (public read, driver-only write)
  - nearby_rides RPC function with corridor matching via ST_DWithin
  - expire_past_rides cron job (hourly)
  - generate_recurring_rides cron job (daily 3 AM)
affects: [03-02, 03-03, 03-04, 03-05, 03-06, 03-07]

# Tech tracking
tech-stack:
  added: [postgis, pg_cron]
  patterns: [geography GIST spatial indexes, corridor matching with ST_DWithin on LINESTRING, extensions-prefixed PostGIS functions, SECURITY DEFINER cron functions]

key-files:
  created:
    - supabase/migrations/00000000000006_enable_postgis.sql
    - supabase/migrations/00000000000007_rides.sql
    - supabase/migrations/00000000000008_ride_waypoints.sql
    - supabase/migrations/00000000000009_recurring_patterns.sql
    - supabase/migrations/00000000000010_favorite_routes.sql
    - supabase/migrations/00000000000011_rides_rls.sql
    - supabase/migrations/00000000000012_ride_search_rpc.sql
    - supabase/migrations/00000000000013_ride_expiry_cron.sql
  modified: []

key-decisions:
  - "PostGIS functions use extensions. prefix throughout (ST_DWithin, ST_Distance, ST_MakePoint, ST_SetSRID) per Supabase requirement"
  - "nearby_rides RPC falls back to point matching when route_geometry is NULL (rides without computed route)"
  - "pg_cron extension enabled in migration 013 (not pre-installed on Supabase hosted)"

patterns-established:
  - "Geography type (not geometry) for all lat/lng columns -- ST_DWithin uses meters"
  - "Corridor matching: ST_DWithin against route LINESTRING with point fallback"
  - "SECURITY DEFINER SET search_path = '' for cron/RPC functions"
  - "6-hour buffer for ride expiry after departure_time"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 3 Plan 1: Database Schema & Geospatial Foundation Summary

**PostGIS rides table with POINT/LINESTRING geography columns, nearby_rides corridor search RPC, RLS policies, and pg_cron expiry/recurring jobs across 8 migrations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T17:29:08Z
- **Completed:** 2026-02-15T17:31:38Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- 8 SQL migrations pushed to remote Supabase covering rides data model, RLS, search RPC, and cron jobs
- Rides table with origin/destination POINT geography, route LINESTRING geography, and 3 GIST spatial indexes
- nearby_rides RPC function performs corridor matching via ST_DWithin on route_geometry with point fallback
- RLS policies enforce driver-only write and authenticated read across all 4 new tables
- Two pg_cron jobs scheduled: hourly ride expiry and daily recurring ride generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PostGIS, rides, waypoints, recurring patterns, and favorite routes migrations** - `c9d78fa` (feat)
2. **Task 2: Create RLS policies, search RPC function, and ride expiry cron job** - `ba24c5f` (feat)

## Files Created/Modified
- `supabase/migrations/00000000000006_enable_postgis.sql` - Enables PostGIS extension in extensions schema
- `supabase/migrations/00000000000007_rides.sql` - Rides table with geography columns, spatial indexes, composite indexes, updated_at trigger
- `supabase/migrations/00000000000008_ride_waypoints.sql` - Pickup/dropoff waypoints with spatial index
- `supabase/migrations/00000000000009_recurring_patterns.sql` - Weekly recurring ride patterns with FK to rides
- `supabase/migrations/00000000000010_favorite_routes.sql` - Saved routes with unique constraint per user
- `supabase/migrations/00000000000011_rides_rls.sql` - RLS policies for all 4 tables
- `supabase/migrations/00000000000012_ride_search_rpc.sql` - nearby_rides() corridor search function
- `supabase/migrations/00000000000013_ride_expiry_cron.sql` - pg_cron extension, expire and recurring generation functions/jobs

## Decisions Made
- PostGIS functions prefixed with `extensions.` throughout all SQL (ST_DWithin, ST_Distance, ST_MakePoint, ST_SetSRID) per Supabase hosted requirement
- nearby_rides RPC uses dual corridor matching: ST_DWithin on route_geometry when available, falls back to origin/destination point matching when route not yet computed
- pg_cron extension enabled explicitly in migration 013 since it was not pre-installed on the Supabase hosted instance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Enabled pg_cron extension in migration 013**
- **Found during:** Task 2 (cron job migration)
- **Issue:** `cron.schedule()` failed with "schema 'cron' does not exist" -- pg_cron not pre-installed on remote Supabase
- **Fix:** Added `CREATE EXTENSION IF NOT EXISTS pg_cron;` at top of migration 013
- **Files modified:** supabase/migrations/00000000000013_ride_expiry_cron.sql
- **Verification:** Migration pushed successfully, cron jobs scheduled
- **Committed in:** ba24c5f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for cron functionality. No scope creep.

## Issues Encountered
- Migration 013 initially failed because pg_cron extension was not pre-installed. Migrations 011 and 012 had already applied successfully. After adding `CREATE EXTENSION IF NOT EXISTS pg_cron`, re-running `supabase db push` applied only the remaining migration 013.

## User Setup Required
None - all migrations pushed to remote Supabase automatically.

## Next Phase Readiness
- Rides data model complete with full geospatial support for corridor-based search
- nearby_rides RPC callable from client via `supabase.rpc('nearby_rides', {...})`
- RLS policies in place for secure ride CRUD operations
- Ready for Plan 03-02 (shared types, validation schemas, query builders)

## Self-Check: PASSED

- All 8 migration files: FOUND
- Commit c9d78fa (Task 1): FOUND
- Commit ba24c5f (Task 2): FOUND

---
*Phase: 03-ride-posting-search*
*Completed: 2026-02-15*
