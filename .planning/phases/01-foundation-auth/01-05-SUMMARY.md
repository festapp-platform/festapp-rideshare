---
phase: 01-foundation-auth
plan: 05
subsystem: onboarding
tags: [onboarding, permissions, location, notifications, splash-screen, app-icon, vitest, zod-validation, async-storage, localStorage]

# Dependency graph
requires:
  - phase: 01-03
    provides: "Auth screens and auth state gate in mobile root layout"
  - phase: 01-04
    provides: "Tab navigation shell and pastel design system"
provides:
  - Shared onboarding step definitions with contextual permission copy
  - Mobile swipeable onboarding flow with native permission requests
  - Web onboarding flow with browser notification API
  - Root layout onboarding gate (redirects new users after auth)
  - Branded splash screen and app icon placeholders (PLAT-10)
  - Auth validation test suite (28 tests) via vitest
affects: [02-profiles, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: [expo-location, expo-notifications, vitest]
  patterns: [AsyncStorage-based onboarding completion flag, shared onboarding step definitions, FlatList horizontal pagination for step-through flows, browser Notification API for web push prep]

key-files:
  created:
    - packages/shared/src/constants/onboarding.ts
    - apps/mobile/app/onboarding.tsx
    - apps/web/app/(app)/onboarding/page.tsx
    - packages/shared/src/validation/__tests__/auth.test.ts
    - apps/mobile/assets/splash.png
  modified:
    - apps/mobile/app/_layout.tsx
    - apps/web/app/(app)/layout.tsx
    - apps/mobile/app.json
    - packages/shared/src/index.ts
    - packages/shared/package.json
    - apps/mobile/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Web onboarding skips location permission step -- browser prompts contextually when location is needed"
  - "Onboarding completion stored in AsyncStorage (mobile) and localStorage (web) -- simple client-side flag, no server round-trip needed"
  - "Web app layout renders onboarding page without nav chrome via pathname check"

patterns-established:
  - "Onboarding flow pattern: shared step definitions in @festapp/shared, platform-specific rendering"
  - "Permission request pattern: contextual explanation first, graceful denial handling, never blocks flow"
  - "Test pattern: vitest run for @festapp/shared validation tests via turbo test task"

# Metrics
duration: 4min
completed: 2026-02-15
---

# Phase 1 Plan 5: Onboarding & Assets Summary

**Post-signup onboarding flow with contextual permission requests, branded splash/icon placeholders, and 28-test auth validation suite**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-15T15:47:24Z
- **Completed:** 2026-02-15T15:51:48Z
- **Tasks:** 1 of 2 (Task 2 is checkpoint:human-verify)
- **Files modified:** 14

## Accomplishments
- Shared onboarding step definitions (welcome, location, notifications, ready) with contextual copy explaining why each permission is needed (ONBR-01, ONBR-05, ONBR-06, ONBR-07)
- Mobile swipeable onboarding with expo-location and expo-notifications permission requests, graceful denial handling, and AsyncStorage completion persistence
- Web onboarding with browser Notification API request and localStorage completion flag
- Root layout onboarding gate: authenticated users who haven't completed onboarding are redirected to /onboarding
- Branded splash screen and app icon placeholders with pastel purple (#7C6FA0) background (PLAT-10)
- 28 vitest tests covering all auth Zod schemas: PhoneSchema, EmailSchema, OtpSchema, PasswordSchema, DisplayNameSchema, SignUpSchema, LoginSchema (TEST-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create onboarding flow, splash screen assets, and auth integration tests** - `af6c718` (feat)

**Task 2** is a checkpoint:human-verify task -- awaiting user verification of complete Phase 1 implementation.

## Files Created/Modified
- `packages/shared/src/constants/onboarding.ts` - Onboarding step definitions with types and ONBOARDING_COMPLETED_KEY
- `packages/shared/src/index.ts` - Exports onboarding constants and types
- `apps/mobile/app/onboarding.tsx` - Mobile swipeable onboarding with permission requests
- `apps/mobile/app/_layout.tsx` - Added onboarding completion check to auth gate
- `apps/web/app/(app)/onboarding/page.tsx` - Web onboarding (simplified, no location step)
- `apps/web/app/(app)/layout.tsx` - Added onboarding path detection for nav-free rendering
- `apps/mobile/app.json` - Updated splash, icon, and adaptiveIcon references with #7C6FA0 background
- `apps/mobile/assets/splash.png` - Placeholder splash screen (pastel purple)
- `apps/mobile/assets/icon.png` - Placeholder app icon (pastel purple)
- `apps/mobile/assets/adaptive-icon.png` - Placeholder adaptive icon (pastel purple)
- `packages/shared/package.json` - Added vitest devDependency and test script
- `packages/shared/src/validation/__tests__/auth.test.ts` - 28 tests for all auth Zod schemas
- `apps/mobile/package.json` - Added expo-location and expo-notifications
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- Web onboarding skips the location permission step because browsers prompt contextually when location is actually needed (unlike mobile which requires upfront permission)
- Onboarding completion stored client-side (AsyncStorage/localStorage) rather than server-side user metadata -- simple, no extra API call, and sufficient for the onboarding gate
- Web app layout detects onboarding path via x-next-pathname header to render without navigation chrome

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all tasks executed smoothly. Typecheck, build, and tests all pass on first run.

## User Setup Required
None beyond what was documented in Plan 02 (Supabase environment variables).

## Next Phase Readiness
- Complete Phase 1 implementation: signup -> onboarding -> home screen flow
- All ONBR requirements covered (ONBR-01, ONBR-05, ONBR-06, ONBR-07)
- PLAT-10 (branded assets) configured in app.json
- TEST-04 (auth validation tests) passing with 28 tests
- Ready for human verification of complete Phase 1 (Task 2 checkpoint)

## Self-Check: PASSED

- All 5 created files verified present
- Task 1 commit (af6c718) verified in git log
- `pnpm turbo typecheck` passes for all 3 packages
- `pnpm turbo build` succeeds with onboarding route compiled
- `pnpm turbo test` passes with 28 tests

---
*Phase: 01-foundation-auth*
*Completed: 2026-02-15*
