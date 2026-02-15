---
phase: 05-communication-notifications
plan: 06
subsystem: notifications
tags: [push-notifications, geospatial, postgis, edge-functions, pg_net, route-alerts]

# Dependency graph
requires:
  - phase: 05-01
    provides: "Notification preferences and send-notification Edge Function"
  - phase: 05-02
    provides: "OneSignal push integration and notification dispatch"
  - phase: 05-04
    provides: "_notify() helper and pg_net trigger pattern"
provides:
  - "check-route-alerts Edge Function with geospatial matching"
  - "find_matching_route_alerts RPC using ST_DWithin (20km)"
  - "Database trigger on rides INSERT for route alert checking"
  - "Alert toggle UI on favorite routes with optimistic updates"
affects: [search, rides, notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edge Function called via pg_net for async processing on INSERT"
    - "RPC for geospatial matching (server-side ST_DWithin)"
    - "Optimistic UI toggle with error revert"

key-files:
  created:
    - "supabase/functions/check-route-alerts/index.ts"
    - "supabase/migrations/00000000000027_route_alert_trigger.sql"
  modified:
    - "apps/web/app/(app)/components/favorite-routes.tsx"

key-decisions:
  - "Used dedicated RPC (find_matching_route_alerts) for geospatial matching instead of raw SQL in Edge Function -- cleaner separation"
  - "Calls sendPush directly from check-route-alerts (via onesignal.ts) instead of chaining through send-notification -- avoids extra HTTP hop"
  - "Bell icon with filled/outline states; always visible when enabled, hover-reveal when disabled"

patterns-established:
  - "Geospatial route matching via RPC with ST_DWithin for alert-enabled favorite routes"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 5 Plan 6: Route Alerts Summary

**Push notification alerts on saved routes via geospatial matching with ST_DWithin (20km) and bell toggle UI**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T21:12:17Z
- **Completed:** 2026-02-15T21:14:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- check-route-alerts Edge Function performs geospatial matching of new rides against alert-enabled favorite routes
- Database trigger on rides INSERT fires pg_net call to Edge Function for upcoming rides
- find_matching_route_alerts RPC uses ST_DWithin with 20km radius, excluding driver's own rides
- Bell icon toggle on favorite routes with optimistic UI, "Alerts on" badge, and hover tooltip

## Task Commits

Each task was committed atomically:

1. **Task 1: Route alert Edge Function and database trigger** - `e99703f` (feat)
2. **Task 2: Alert toggle on favorite routes UI** - `e2d5041` (feat)

## Files Created/Modified
- `supabase/functions/check-route-alerts/index.ts` - Edge Function: matches new rides against alert-enabled favorite routes, sends push via OneSignal
- `supabase/migrations/00000000000027_route_alert_trigger.sql` - RPC for geospatial matching + trigger on rides INSERT via pg_net
- `apps/web/app/(app)/components/favorite-routes.tsx` - Added alert toggle bell icon, alert_enabled in query, optimistic update

## Decisions Made
- Used dedicated RPC (find_matching_route_alerts) for geospatial matching instead of raw SQL in Edge Function -- cleaner separation of concerns and reusable
- Edge Function calls sendPush directly via _shared/onesignal.ts after checking preferences -- avoids extra HTTP hop through send-notification
- Bell icon always visible when alerts enabled (filled primary color), hover-reveal when disabled -- clear visual state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Route alerts complete: SRCH-09 satisfied
- All Phase 5 plans (01-06) now complete
- Push notifications, chat, and alerts infrastructure ready for Phase 6

## Self-Check: PASSED

All 3 files verified present. Both commits (e99703f, e2d5041) found in git log.

---
*Phase: 05-communication-notifications*
*Completed: 2026-02-15*
