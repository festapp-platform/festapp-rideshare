---
phase: 13-legal-privacy-observability
plan: 03
subsystem: ui
tags: [react-context, location, privacy, i18n, banner]

# Dependency graph
requires:
  - phase: 07-live-location-tracking
    provides: useLiveLocation hook with GPS broadcast
  - phase: 11-i18n-resilience
    provides: i18n context with t() function and flat dot-notation keys
provides:
  - LocationSharingContext for global location sharing state
  - LocationSharingBanner persistent privacy indicator
  - useLocationSharing hook for context consumption
affects: [mobile-location-banner]

# Tech tracking
tech-stack:
  added: []
  patterns: [context-provider-with-registered-handler, raw-stop-vs-public-stop separation]

key-files:
  created:
    - apps/web/app/(app)/contexts/location-sharing-context.tsx
    - apps/web/app/(app)/components/location-sharing-banner.tsx
  modified:
    - apps/web/app/(app)/layout.tsx
    - apps/web/app/(app)/hooks/use-live-location.ts
    - apps/web/lib/i18n/translations.ts

key-decisions:
  - "rawGpsStop/stopSharing split avoids circular calls between banner and hook"
  - "clearSharing (state-only) vs stopSharing (handler+state) for two stop paths"
  - "try/catch for optional useLocationSharing at hook top level for test compatibility"
  - "contextNotifiedRef prevents duplicate startSharing calls on every GPS position"

patterns-established:
  - "Registered handler pattern: context stores external cleanup handler, calls it on user action"
  - "Optional context consumption: try/catch around useContext for hooks that may run outside provider"

requirements-completed: [LEGAL-03]

# Metrics
duration: 5min
completed: 2026-02-16
---

# Phase 13 Plan 03: Location Sharing Indicator Summary

**Global persistent amber banner with pulsing dot showing who sees driver location, with one-tap stop button on all authenticated pages**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-16T22:16:39Z
- **Completed:** 2026-02-16T22:22:22Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- LocationSharingContext with start/stop/clear/registerStopHandler pattern persists across route navigation
- Sticky amber banner with pulsing dot, passenger names, and stop button visible on all authenticated pages
- useLiveLocation hook notifies global context on first GPS position and registers stop handler
- i18n translations for location banner in cs/sk/en

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LocationSharing context and banner component** - `b874146` (feat)
2. **Task 2: Integrate banner into layout and connect to useLiveLocation hook** - `c2162b0` (feat)

## Files Created/Modified
- `apps/web/app/(app)/contexts/location-sharing-context.tsx` - Global location sharing state provider with registered stop handler pattern
- `apps/web/app/(app)/components/location-sharing-banner.tsx` - Sticky amber banner with pulsing dot, passenger names, stop button
- `apps/web/app/(app)/layout.tsx` - LocationSharingProvider wrapping content, banner as first element in main
- `apps/web/app/(app)/hooks/use-live-location.ts` - Context integration: startSharing on first GPS, rawGpsStop registered, clearSharing on unmount
- `apps/web/lib/i18n/translations.ts` - location.sharingWith, location.stop, location.passengers keys in all 3 locales

## Decisions Made
- Split stopSharing into rawGpsStop (GPS cleanup only) and public stopSharing (GPS + context clear) to avoid circular calls when banner triggers stop
- Added clearSharing to context that resets state without calling registered handler, used by hook on unmount/direct stop
- useLocationSharing wrapped in try/catch at hook top level so tests without provider still work
- contextNotifiedRef tracks whether context was already notified to prevent duplicate startSharing on every GPS position update

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added clearSharing method to prevent circular stop calls**
- **Found during:** Task 2
- **Issue:** Plan's design discussion identified potential circular calls between banner stopSharing and hook stopSharing
- **Fix:** Added clearSharing (state-only reset) to context; hook uses clearSharing, banner uses stopSharing (calls handler + clears)
- **Files modified:** contexts/location-sharing-context.tsx, hooks/use-live-location.ts
- **Verification:** Build passes, no circular dependency

---

**Total deviations:** 1 auto-fixed (1 bug prevention)
**Impact on plan:** Essential for correct stop behavior. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- LEGAL-03 requirement fully satisfied for web
- Mobile location banner deferred (as specified)
- Ready for Phase 14+ work

---
*Phase: 13-legal-privacy-observability*
*Completed: 2026-02-16*
