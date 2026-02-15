---
phase: 08-events-flexible-gamification
plan: 03
subsystem: database, ui
tags: [supabase, rpc, rls, postgis, nextjs, react-hook-form, zod, optimistic-ui]

requires:
  - phase: 03-ride-posting
    provides: rides table, PostGIS geography columns, compute-route Edge Function, WKT insert pattern
  - phase: 05-messaging-notifications
    provides: _notify() helper, send-notification Edge Function, OneSignal push
provides:
  - route_intents and route_intent_subscriptions tables with RLS
  - confirm_route_intent RPC (creates ride, notifies subscribers, returns ride_id)
  - cancel_route_intent RPC
  - Route intent browsing, creation, detail, subscribe, and confirm UI pages
  - SubscribeButton reusable component with optimistic UI
affects: [notifications, rides, flexible-rides]

tech-stack:
  added: []
  patterns:
    - "Route intents as date-less ride stubs converted to real rides via RPC"
    - "Subscriber count maintained via INSERT/DELETE trigger on subscriptions"
    - "Two-step confirm pattern on ConfirmDate form"

key-files:
  created:
    - supabase/migrations/00000000000034_flexible_rides.sql
    - packages/shared/src/constants/flexible.ts
    - packages/shared/src/validation/flexible.ts
    - packages/shared/src/queries/flexible.ts
    - apps/web/app/(app)/routes/page.tsx
    - apps/web/app/(app)/routes/route-intent-list.tsx
    - apps/web/app/(app)/routes/new/page.tsx
    - apps/web/app/(app)/routes/new/route-intent-form.tsx
    - apps/web/app/(app)/routes/[id]/page.tsx
    - apps/web/app/(app)/routes/[id]/route-detail.tsx
    - apps/web/app/(app)/routes/[id]/confirm-date.tsx
    - apps/web/app/(app)/components/subscribe-button.tsx
  modified:
    - packages/shared/src/types/database.ts
    - packages/shared/src/index.ts
    - supabase/functions/send-notification/index.ts
    - supabase/functions/_shared/notifications.ts

key-decisions:
  - "flexible_ride_confirmed notification type maps to push_route_alerts preference (closest match, no new DB column)"
  - "Route intent form is single-page (not wizard) since no date step needed"
  - "SubscribeButton uses optimistic UI with INSERT/DELETE toggle and error revert"

patterns-established:
  - "Route intents as flexible ride stubs: driver posts route, passengers subscribe, driver confirms date to create real ride"
  - "Two-step confirm for confirm_route_intent: first click stages, second click submits"

duration: 6min
completed: 2026-02-16
---

# Phase 08 Plan 03: Flexible Rides Summary

**Route intents with subscriber notifications: date-less rides that convert to bookable rides via confirm_route_intent RPC with push notification dispatch**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-15T23:41:30Z
- **Completed:** 2026-02-15T23:47:30Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Route intents and subscriptions database tables with full RLS, spatial indexes, and subscriber count trigger
- confirm_route_intent RPC creates a ride from intent data, notifies all subscribers via _notify(), and returns the new ride_id
- Complete UI flow: browse intents at /routes, create at /routes/new, subscribe/confirm at /routes/[id]
- ConfirmDate extracts ride_id from RPC response and redirects to /rides/{rideId} with toast notification

## Task Commits

Each task was committed atomically:

1. **Task 1: Flexible rides database migration and shared package** - `fa91810` (feat)
2. **Task 2: Route intent UI pages and subscription/confirmation flows** - `4cccc8a` (feat)

## Files Created/Modified
- `supabase/migrations/00000000000034_flexible_rides.sql` - Route intents, subscriptions, RLS, RPCs, triggers
- `packages/shared/src/constants/flexible.ts` - ROUTE_INTENT_STATUS constants
- `packages/shared/src/validation/flexible.ts` - CreateRouteIntentSchema, ConfirmRouteIntentSchema
- `packages/shared/src/queries/flexible.ts` - Query builders for route intents and subscriptions
- `packages/shared/src/types/database.ts` - Added route_intents, route_intent_subscriptions tables and RPCs
- `packages/shared/src/index.ts` - Exported all new flexible ride types, schemas, queries, constants
- `supabase/functions/send-notification/index.ts` - Added flexible_ride_confirmed to VALID_TYPES
- `supabase/functions/_shared/notifications.ts` - Added flexible_ride_confirmed notification type
- `apps/web/app/(app)/routes/page.tsx` - Route intents browsing page
- `apps/web/app/(app)/routes/route-intent-list.tsx` - Client-side grid with search filter
- `apps/web/app/(app)/routes/new/page.tsx` - Route intent creation page
- `apps/web/app/(app)/routes/new/route-intent-form.tsx` - Form with address autocomplete and route map
- `apps/web/app/(app)/routes/[id]/page.tsx` - Route intent detail server component
- `apps/web/app/(app)/routes/[id]/route-detail.tsx` - Detail client component with driver card, map, actions
- `apps/web/app/(app)/routes/[id]/confirm-date.tsx` - Date confirmation form calling RPC
- `apps/web/app/(app)/components/subscribe-button.tsx` - Reusable optimistic subscribe toggle

## Decisions Made
- flexible_ride_confirmed notification type maps to push_route_alerts preference -- closest existing preference field, avoids new DB column
- Route intent form is single-page layout (not wizard like ride-form) since there is no date step
- SubscribeButton uses optimistic UI with error revert pattern (consistent with existing booking actions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added flexible_ride_confirmed to send-notification Edge Function**
- **Found during:** Task 1
- **Issue:** The confirm_route_intent RPC calls _notify() with type 'flexible_ride_confirmed', but send-notification would reject it as invalid
- **Fix:** Added 'flexible_ride_confirmed' to VALID_TYPES array and NotificationType union
- **Files modified:** supabase/functions/send-notification/index.ts, supabase/functions/_shared/notifications.ts
- **Verification:** Type compiles, notification dispatch will succeed
- **Committed in:** fa91810 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for notification delivery. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Flexible rides system complete with full database, shared types, and UI
- Ready for Phase 08 plans 04-05 (remaining gamification/events features)

## Self-Check: PASSED

All 13 created files verified present. Both task commits (fa91810, 4cccc8a) verified in git log.

---
*Phase: 08-events-flexible-gamification*
*Completed: 2026-02-16*
