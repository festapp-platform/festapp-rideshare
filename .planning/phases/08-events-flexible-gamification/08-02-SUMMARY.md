---
phase: 08-events-flexible-gamification
plan: 02
subsystem: ui
tags: [events, next.js, react, admin, ride-linking, address-autocomplete]

# Dependency graph
requires:
  - phase: 08-events-flexible-gamification
    provides: Events table, RLS, admin RPCs, shared types/schemas/queries
provides:
  - Event browsing page with approved event cards and search
  - Event creation form with address autocomplete and pending status
  - Event detail page with linked ride listings and share URL
  - Admin event management with approve/reject workflow
  - Ride form event linking (URL param pre-fill and manual dropdown)
affects: [08-05-events-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [event-ui-pages, admin-event-approval-ui, ride-event-linking]

key-files:
  created:
    - apps/web/app/(app)/events/page.tsx
    - apps/web/app/(app)/events/events-client.tsx
    - apps/web/app/(app)/events/new/page.tsx
    - apps/web/app/(app)/events/[id]/page.tsx
    - apps/web/app/(app)/events/[id]/event-detail.tsx
    - apps/web/app/admin/events/page.tsx
    - apps/web/app/admin/events/[id]/page.tsx
  modified:
    - apps/web/app/(app)/rides/new/page.tsx
    - apps/web/app/(app)/components/ride-form.tsx
    - apps/web/app/admin/components/admin-sidebar.tsx
    - packages/shared/src/queries/events.ts

key-decisions:
  - "PostgREST FK hint profiles!events_creator_id_fkey for events.creator_id disambiguation (two FKs to profiles)"
  - "Admin event detail uses two-click confirm pattern consistent with existing moderation actions"
  - "Ride form fetches approved events client-side for optional linking dropdown"

patterns-established:
  - "PostgREST FK hint pattern for tables with multiple FKs to same table"
  - "Event linking via URL search param (?eventId=) with server-side pre-fill"

# Metrics
duration: 6min
completed: 2026-02-16
---

# Phase 8 Plan 2: Events UI & Admin Management Summary

**Event browsing/creation/detail pages, admin approve/reject workflow, and ride form event linking with address pre-fill**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-15T23:50:56Z
- **Completed:** 2026-02-15T23:56:59Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Events browsing page at /events with search filter and grid of event cards
- Event creation form at /events/new with AddressAutocomplete, datetime-local inputs, and pending status
- Event detail page at /events/[id] showing event info, linked rides, share button, and status badges
- Admin event management at /admin/events with pending/approved/rejected tabs and two-click approve/reject
- Ride form extended with optional event linking dropdown and URL param pre-fill from event destination

## Task Commits

Each task was committed atomically:

1. **Task 1: Event browsing, creation, and detail pages** - `28cad8d` (feat)
2. **Task 2: Admin event management pages** - `836db05` (feat)

## Files Created/Modified
- `apps/web/app/(app)/events/page.tsx` - Server component fetching approved events
- `apps/web/app/(app)/events/events-client.tsx` - Client component with search filter and event cards grid
- `apps/web/app/(app)/events/new/page.tsx` - Event creation form with Zod validation and AddressInput
- `apps/web/app/(app)/events/[id]/page.tsx` - Server component fetching event + rides in parallel
- `apps/web/app/(app)/events/[id]/event-detail.tsx` - Event detail with ride listings, share, status badges
- `apps/web/app/(app)/rides/new/page.tsx` - Added eventId search param handling and linked event pre-fill
- `apps/web/app/(app)/components/ride-form.tsx` - Added event linking dropdown and event_id in ride creation
- `apps/web/app/admin/events/page.tsx` - Admin events list with pending/approved/rejected tabs
- `apps/web/app/admin/events/[id]/page.tsx` - Admin event detail with two-click approve/reject
- `apps/web/app/admin/components/admin-sidebar.tsx` - Added Events link with Calendar icon
- `packages/shared/src/queries/events.ts` - Fixed PostgREST FK hints for creator_id disambiguation

## Decisions Made
- PostgREST FK hint `profiles!events_creator_id_fkey` needed for events table (two FKs to profiles: creator_id and approved_by)
- Admin event detail normalizes PostgREST FK join result (may be array or object depending on relationship type)
- Ride form fetches approved events client-side on mount for the optional event linking dropdown
- Event detail page shows rides section only for approved events; pending/rejected show status-specific UI

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed PostgREST FK hint for events.creator_id**
- **Found during:** Task 1 (build verification)
- **Issue:** Events table has two FK relationships to profiles (creator_id, approved_by), causing PostgREST ambiguity error
- **Fix:** Updated all event query builders to use `profiles!events_creator_id_fkey` FK hint
- **Files modified:** packages/shared/src/queries/events.ts
- **Verification:** Build passes cleanly
- **Committed in:** 28cad8d (Task 1 commit)

**2. [Rule 1 - Bug] Normalized PostgREST FK join for admin pages**
- **Found during:** Task 2 (build verification)
- **Issue:** PostgREST FK join returns array type that doesn't match single-object interface
- **Fix:** Added runtime normalization of creator field (array to single object)
- **Files modified:** apps/web/app/admin/events/page.tsx, apps/web/app/admin/events/[id]/page.tsx
- **Verification:** Build passes cleanly
- **Committed in:** 836db05 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes required for type safety with PostgREST FK disambiguation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Event UI pages complete, ready for any polish work in 08-05
- Admin can approve/reject events from /admin/events
- Ride form supports event linking via URL params and manual dropdown

---
*Phase: 08-events-flexible-gamification*
*Completed: 2026-02-16*
