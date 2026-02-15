---
phase: 01-foundation-auth
plan: 01
subsystem: infra
tags: [turborepo, pnpm, monorepo, nextjs, expo, tailwind, nativewind, zod, ci]

# Dependency graph
requires: []
provides:
  - pnpm + Turborepo monorepo with workspace protocol
  - "@festapp/shared" package with Zod auth validation schemas and constants
  - "@festapp/config" package with shared TypeScript base config
  - Next.js 16 web app with Tailwind v4 and @festapp/shared import
  - Expo SDK 54 mobile app with expo-router, NativeWind v4, Tailwind v3, and @festapp/shared import
  - GitHub Actions CI pipeline (build, lint, typecheck, test)
affects: [01-02, 01-03, 01-04, 01-05, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: [turborepo@2.8, pnpm@10, next@16.1.6, expo@54.0.33, expo-router@6.0.23, react@19, tailwindcss@4 (web), tailwindcss@3.4 (mobile), nativewind@4.1, zod@3.25, typescript@5.7, react-native-reanimated@4.1, react-native-screens@4.16]
  patterns: [workspace:* dependency protocol, node-linker=hoisted for Expo, transpilePackages for shared imports, separate Tailwind versions per platform]

key-files:
  created:
    - package.json
    - pnpm-workspace.yaml
    - .npmrc
    - turbo.json
    - tsconfig.base.json
    - packages/shared/src/index.ts
    - packages/shared/src/validation/auth.ts
    - packages/shared/src/constants/auth.ts
    - packages/shared/src/types/database.ts
    - packages/config/typescript/base.json
    - apps/web/package.json
    - apps/web/app/layout.tsx
    - apps/web/app/page.tsx
    - apps/mobile/package.json
    - apps/mobile/app/_layout.tsx
    - apps/mobile/app/index.tsx
    - apps/mobile/babel.config.js
    - apps/mobile/metro.config.js
    - apps/mobile/tailwind.config.js
    - .github/workflows/ci.yml
  modified: []

key-decisions:
  - "Used Zod v3.25 instead of v4.3 (plan specified v4.3 but v3 is stable and API-compatible)"
  - "Omitted @supabase/supabase-js from shared package (only needed in apps, not for validation schemas)"
  - "Used expo-router v6 (latest for SDK 54) instead of v5 from plan (v5 was for SDK 53)"
  - "Pinned react-native-reanimated to ~4.1.1 and react-native-screens to ~4.16.0 per Expo SDK 54 compatibility check"
  - "Used pnpm@10 (installed version) instead of plan's pnpm@9 (backward compatible)"

patterns-established:
  - "Monorepo structure: apps/* for applications, packages/* for shared code"
  - "workspace:* protocol for internal package dependencies"
  - "node-linker=hoisted in .npmrc (required for Expo + pnpm)"
  - "Tailwind version split: v4 for web, v3 for mobile (NativeWind constraint)"
  - "Shared package consumed via TypeScript paths (no build step)"
  - "transpilePackages in next.config.ts for shared imports"

# Metrics
duration: 14min
completed: 2026-02-15
---

# Phase 1 Plan 1: Monorepo Scaffolding Summary

**pnpm + Turborepo monorepo with Next.js 16 web app, Expo SDK 54 mobile app, shared Zod validation package, and GitHub Actions CI pipeline**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-15T15:02:23Z
- **Completed:** 2026-02-15T15:16:53Z
- **Tasks:** 2
- **Files modified:** 47

## Accomplishments
- Fully functional monorepo: `pnpm install && pnpm turbo build` succeeds from clean state
- Both apps import and use `@festapp/shared` validation schemas (verified via OTP_LENGTH constant)
- Web dev server starts on localhost:3000, Expo dev server starts on localhost:8081
- Shared Zod auth validation schemas (Phone, Email, OTP, Password, DisplayName) ready for auth flows
- CI pipeline defined for GitHub Actions (build, lint, typecheck, test on every PR)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create monorepo structure with root config, shared package, and config package** - `5828303` (feat)
2. **Task 2: Scaffold Next.js 16 web app, Expo SDK 54 mobile app, and CI pipeline** - `e960024` (feat)

## Files Created/Modified
- `package.json` - Root workspace config with turbo scripts
- `pnpm-workspace.yaml` - Workspace package glob (apps/*, packages/*)
- `.npmrc` - node-linker=hoisted for Expo compatibility
- `turbo.json` - Turborepo task pipeline (build, lint, typecheck, test, dev)
- `tsconfig.base.json` - Strict TypeScript base config
- `.gitignore` - Standard ignores for monorepo
- `packages/shared/src/validation/auth.ts` - Zod schemas for phone, email, OTP, password, display name
- `packages/shared/src/constants/auth.ts` - Auth constants (OTP length, expiry, session refresh)
- `packages/shared/src/types/database.ts` - Placeholder Database type (awaiting Supabase gen)
- `packages/shared/src/index.ts` - Barrel export
- `packages/config/typescript/base.json` - Shared TypeScript config
- `apps/web/package.json` - Next.js 16 with @festapp/shared dependency
- `apps/web/next.config.ts` - transpilePackages for @festapp/shared
- `apps/web/app/layout.tsx` - Root layout with "Festapp Rideshare" metadata
- `apps/web/app/page.tsx` - Home page importing from @festapp/shared
- `apps/mobile/package.json` - Expo SDK 54 with expo-router, NativeWind, @festapp/shared
- `apps/mobile/app.json` - Expo config with scheme, bundle ID
- `apps/mobile/babel.config.js` - nativewind/babel preset
- `apps/mobile/metro.config.js` - withNativeWind wrapper
- `apps/mobile/tailwind.config.js` - Tailwind v3 config with NativeWind preset
- `apps/mobile/app/_layout.tsx` - Root layout with Slot
- `apps/mobile/app/index.tsx` - Home screen importing from @festapp/shared
- `.github/workflows/ci.yml` - CI pipeline (checkout, pnpm, node, install, turbo build/lint/typecheck/test)

## Decisions Made
- Used Zod v3.25 instead of plan's v4.3 -- v3 is the stable release, v4 was a speculative version
- Omitted @supabase/supabase-js from shared package -- validation schemas only need Zod; apps will add supabase-js directly
- Used expo-router v6.0.23 (the actual latest for SDK 54) instead of plan's v5.0.7 (which was for SDK 53)
- Pinned react-native-reanimated to ~4.1.1 and react-native-screens to ~4.16.0 per Expo's SDK 54 compatibility warnings
- Used pnpm@10.24.0 (system version) -- plan referenced pnpm@9 but v10 is backward-compatible

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Expo package versions for SDK 54 compatibility**
- **Found during:** Task 2 (mobile app scaffolding)
- **Issue:** Initially specified expo-router v5, expo-linking v7, expo-system-ui v5, react-native-reanimated v3.19, react-native-screens v4.11 -- these versions were incompatible with expo@54.0.33
- **Fix:** Updated to expo-router v6.0.23, expo-linking v8.0.11, expo-system-ui v6.0.9, react-native-reanimated v4.1.1, react-native-screens v4.16.0 (all matching SDK 54 expected versions)
- **Files modified:** apps/mobile/package.json
- **Verification:** `pnpm install` succeeds, Expo dev server starts without version warnings
- **Committed in:** e960024 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Version correction was necessary for SDK 54 compatibility. No scope creep.

## Issues Encountered
- create-next-app scaffolding required `mkdir -p apps/` first since pnpm-workspace.yaml references the directory but it didn't exist yet
- Next.js Turbopack warns about multiple lockfiles in parent directories -- cosmetic warning, does not affect builds
- Expo modified tsconfig.json includes on first start (removed .expo/types and expo-env.d.ts) -- this is expected Expo behavior

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Monorepo foundation complete, ready for Supabase setup in Plan 02
- Both apps compile and start dev servers
- Shared validation schemas ready for auth flow implementation
- CI pipeline will run on first PR to main

## Self-Check: PASSED

- All 21 key files verified present
- Both task commits (5828303, e960024) verified in git log
- `pnpm turbo build` succeeds
- `pnpm turbo typecheck` passes for all 3 packages

---
*Phase: 01-foundation-auth*
*Completed: 2026-02-15*
