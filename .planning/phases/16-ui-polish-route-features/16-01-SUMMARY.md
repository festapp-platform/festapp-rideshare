---
phase: 16-ui-polish-route-features
plan: 01
subsystem: ui
tags: [leaflet, i18n, map-picker, star-rating, impact-dashboard]

# Dependency graph
requires:
  - phase: 15-i18n-coverage
    provides: "useI18n pattern and translation infrastructure"
  - phase: 14-price-formatting-chat-optimization-ai-tests
    provides: "Price slider value display below slider (UX-04)"
provides:
  - "MapLocationPicker with initialLat/initialLng zoom-14 support"
  - "Localized StarRating 'New' badge via common.newUser key"
  - "Impact dashboard without Money Saved stat card"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MapLocationPicker optional initial coordinates for context-aware zoom"

key-files:
  created: []
  modified:
    - "apps/web/app/(app)/components/map-location-picker.tsx"
    - "apps/web/app/(app)/components/ride-form.tsx"
    - "apps/web/app/(app)/components/star-rating.tsx"
    - "apps/web/app/(app)/impact/impact-dashboard.tsx"
    - "apps/web/lib/i18n/translations.ts"

key-decisions:
  - "Impact dashboard grid changed from 4-col to 3-col after Money Saved removal"
  - "Czech/Slovak translation for 'New' user badge uses 'Novy' (masculine default)"

patterns-established: []

requirements-completed: [UX-01, UX-02, UX-03, UX-04]

# Metrics
duration: 4min
completed: 2026-02-17
---

# Phase 16 Plan 01: UI Polish Items Summary

**Map picker zooms to existing coordinates at zoom 14, StarRating badge localized to cs/sk/en, Money Saved card removed from impact dashboard**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-16T23:54:11Z
- **Completed:** 2026-02-16T23:58:12Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- MapLocationPicker accepts optional initialLat/initialLng props; when provided, opens at zoom 14 centered on existing selection with pre-placed marker
- ride-form.tsx passes origin/destination coordinates to MapLocationPicker based on which field triggered the picker
- StarRating "New" badge now uses t("common.newUser") with translations: cs="Novy", sk="Novy", en="New"
- Money Saved StatCard and unused Wallet import removed from impact dashboard; grid adjusted to 3-column layout
- UX-04 (price slider value below slider) confirmed already present from Phase 14

## Task Commits

Changes were already committed as part of the 16-02 batch:

1. **Task 1: Map picker + StarRating + Money Saved + UX-04 verify** - `b25e003` (feat)

**Plan metadata:** (this summary)

## Files Created/Modified

- `apps/web/app/(app)/components/map-location-picker.tsx` - Added initialLat/initialLng props, conditional zoom/center, initial marker placement
- `apps/web/app/(app)/components/ride-form.tsx` - Passes origin/destination coords to MapLocationPicker
- `apps/web/app/(app)/components/star-rating.tsx` - Added useI18n import, replaced hardcoded "New" with t("common.newUser")
- `apps/web/app/(app)/impact/impact-dashboard.tsx` - Removed Money Saved StatCard, Wallet import, formatPrice import; grid 4-col to 3-col
- `apps/web/lib/i18n/translations.ts` - Added common.newUser key to type interface, cs, sk, en sections

## Decisions Made

- Impact dashboard grid changed from `grid-cols-2 md:grid-cols-4` to `grid-cols-3` after removing Money Saved (3 remaining cards fit cleanly)
- Czech and Slovak "New user" translation uses "Novy" (masculine default, matching the original UX requirement)
- Left `total_money_saved_czk` in the ImpactStats interface and RPC query to avoid breaking the database function

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

All changes were already present in HEAD (committed as part of an earlier session batch in `b25e003`). No new commit was needed for the code changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- UI polish items complete; ready for remaining Phase 16 plans (16-02, 16-03, 16-04)
- Pre-existing TypeScript errors in sk/en translations (missing keys from earlier phases) are out of scope for this plan

---
*Phase: 16-ui-polish-route-features*
*Completed: 2026-02-17*
