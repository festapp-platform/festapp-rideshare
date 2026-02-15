---
phase: 02-profiles-identity
plan: 05
subsystem: ui
tags: [onboarding, profile, role-selection, vehicle-setup, supabase, react, react-native]

# Dependency graph
requires:
  - phase: 02-02
    provides: "Profile edit UI, avatar upload helpers (uploadAvatar, pickAndUploadAvatar)"
  - phase: 02-03
    provides: "Vehicle management, VehicleSchema, vehicle photo upload helpers"
provides:
  - "Extended onboarding flow with profile creation, role selection, and optional vehicle setup"
  - "PROFILE_ONBOARDING_COMPLETED_KEY for backward-compatible onboarding state"
  - "New shared onboarding step types: profile, role, vehicle"
affects: [03-ride-creation, 04-search-booking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic step filtering based on role selection (vehicle step conditional on driver/both)"
    - "Dual onboarding key pattern for backward compat (ONBOARDING_COMPLETED_KEY + PROFILE_ONBOARDING_COMPLETED_KEY)"
    - "FlatList scrollEnabled toggle for form vs passive steps on mobile"

key-files:
  created: []
  modified:
    - packages/shared/src/constants/onboarding.ts
    - packages/shared/src/index.ts
    - apps/web/app/(app)/onboarding/page.tsx
    - apps/mobile/app/onboarding.tsx

key-decisions:
  - "Separate PROFILE_ONBOARDING_COMPLETED_KEY for backward compat -- existing users keep their onboarding_completed state but see new profile steps"
  - "Mobile vehicle photo upload offered via Alert after save (vehicle ID needed for storage path) -- consistent with 02-03 pattern"
  - "Web uses inline file inputs for avatar/vehicle photos with local preview; mobile uses pickAndUploadAvatar for immediate upload"
  - "FlatList Option A kept: scrollEnabled disabled for form steps, re-enabled for passive steps"

patterns-established:
  - "Conditional onboarding steps: filter step array based on user selections at runtime"
  - "Dual localStorage/AsyncStorage key pattern for staged feature rollout"

# Metrics
duration: 4min
completed: 2026-02-15
---

# Phase 2 Plan 5: Profile Onboarding Summary

**Extended onboarding with profile creation (name + avatar), role selection (rider/driver/both), and conditional vehicle setup on web and mobile**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-15T17:00:17Z
- **Completed:** 2026-02-15T17:04:16Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Onboarding now guides new users through profile setup (name + avatar) and role selection before permissions
- Driver/both users see optional vehicle setup step with form validation and photo upload
- Backward compatible: existing users who completed old onboarding see only new profile/role steps, not welcome/permissions again
- Step indicators dynamically reflect filtered step count based on role selection

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend onboarding step definitions and update web onboarding flow** - `0939bdc` (feat)
2. **Task 2: Update mobile onboarding flow with profile, role, and vehicle steps** - `c1404b0` (feat)

## Files Created/Modified
- `packages/shared/src/constants/onboarding.ts` - Added profile/role/vehicle step types, PROFILE_ONBOARDING_COMPLETED_KEY, and 3 new step definitions
- `packages/shared/src/index.ts` - Exported PROFILE_ONBOARDING_COMPLETED_KEY
- `apps/web/app/(app)/onboarding/page.tsx` - Full web onboarding with profile (name + file input avatar), role (3 selectable cards), vehicle (form + photo), backward compat detection
- `apps/mobile/app/onboarding.tsx` - Full mobile onboarding with profile (TextInput + image picker avatar), role (TouchableOpacity cards), vehicle (form + Alert-based photo), FlatList scroll control

## Decisions Made
- Separate PROFILE_ONBOARDING_COMPLETED_KEY used for backward compat (per research pitfall #5) -- existing users keep onboarding_completed but are prompted for new steps
- Mobile vehicle photo upload offered after save via Alert dialog, consistent with 02-03 pattern
- Web avatar uses local preview + upload on save; mobile uploads immediately on pick (consistent with 02-02 patterns)
- FlatList Option A chosen: scrollEnabled toggled per step type rather than replacing with state machine

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Onboarding flow complete for both platforms
- Profile data (name, avatar, role) and optional vehicle persist in Supabase
- Phase 2 fully complete (all 5 plans done) -- ready for Phase 3 ride creation

---
*Phase: 02-profiles-identity*
*Completed: 2026-02-15*
