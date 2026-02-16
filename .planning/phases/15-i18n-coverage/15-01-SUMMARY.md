---
phase: 15-i18n-coverage
plan: 01
subsystem: ui
tags: [i18n, react-context, interpolation, translations, czech, slovak, english]

# Dependency graph
requires:
  - phase: 11-01
    provides: i18n provider with t() function and translation dictionaries
provides:
  - t() with variable interpolation via optional vars parameter
  - ~80 new translation keys for rideDetail, myRides, bookingButton namespaces
  - Fully translated ride-detail, my-rides, and booking-button components
affects: [15-02, 15-03, any future i18n work]

# Tech tracking
tech-stack:
  added: []
  patterns: [t() interpolation with regex {var} replacement, seatWord helper for pluralization]

key-files:
  modified:
    - apps/web/lib/i18n/provider.tsx
    - apps/web/lib/i18n/translations.ts
    - apps/web/app/(app)/components/ride-detail.tsx
    - apps/web/app/(app)/my-rides/page.tsx
    - apps/web/app/(app)/components/booking-button.tsx
    - apps/web/app/(auth)/login/page.tsx
    - apps/web/app/(auth)/signup/page.tsx
    - apps/web/app/(app)/components/location-sharing-banner.tsx

key-decisions:
  - "t() interpolation uses regex replace for {var} patterns with global flag"
  - "Existing callers migrated from manual .replace() to vars parameter"
  - "Preference labels moved inside component render for reactive translation"

patterns-established:
  - "t('key', { var: value }) for interpolated translations"
  - "seatWord(count) helper for seat/seats pluralization in components"

requirements-completed: [I18N-01, I18N-02]

# Metrics
duration: 7min
completed: 2026-02-17
---

# Phase 15 Plan 01: i18n Interpolation & Core Component Translation Summary

**t() interpolation with {var} replacement + ~80 translation keys for ride-detail, my-rides, and booking-button in cs/sk/en**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-16T23:13:10Z
- **Completed:** 2026-02-16T23:20:40Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- t() function now accepts optional vars parameter for {placeholder} interpolation
- ride-detail.tsx fully translated (~45 keys) including toast messages, section headers, and button labels
- my-rides/page.tsx fully translated (~20 keys) including tabs, empty states, and action buttons
- booking-button.tsx fully translated (~13 keys) including status badges and error messages
- All existing callers with placeholder keys (login, signup, location-sharing-banner) migrated to vars parameter
- TypeScript compilation and production build pass clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Add interpolation to t() and fix existing callers** - `ca0a0c0` (feat)
2. **Task 2: Translate ride-detail, my-rides, and booking-button** - `cc622e4` (feat)

## Files Created/Modified
- `apps/web/lib/i18n/provider.tsx` - Added vars parameter to t() with regex interpolation
- `apps/web/lib/i18n/translations.ts` - ~80 new keys in TranslationKeys type and cs/sk/en dictionaries
- `apps/web/app/(app)/components/ride-detail.tsx` - All UI strings use t() with useI18n
- `apps/web/app/(app)/my-rides/page.tsx` - All UI strings use t() with useI18n
- `apps/web/app/(app)/components/booking-button.tsx` - All UI strings use t() with useI18n
- `apps/web/app/(auth)/login/page.tsx` - Migrated from .replace() to vars parameter
- `apps/web/app/(auth)/signup/page.tsx` - Migrated from .replace() to vars parameter
- `apps/web/app/(app)/components/location-sharing-banner.tsx` - Migrated from .replace() to vars parameter

## Decisions Made
- t() interpolation uses regex replace with global flag for multiple occurrences of same variable
- Preference labels (Smoking allowed, Pets welcome, etc.) moved inside component render so they react to locale changes
- BookingStatusBadge in my-rides moved from module-level const to function component for translation reactivity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Interpolation infrastructure ready for remaining components in 15-02 and 15-03
- Pattern established: useI18n() hook + t() with vars for all new component translations

---
*Phase: 15-i18n-coverage*
*Completed: 2026-02-17*
