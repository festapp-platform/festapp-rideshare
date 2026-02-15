# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Drivers and passengers can find each other for shared rides quickly and effortlessly -- simpler, more trustworthy, and completely free.
**Current focus:** Phase 1 - Foundation & Auth

## Current Position

Phase: 1 of 10 (Foundation & Auth)
Plan: 5 of 5 in current phase (awaiting human verification checkpoint)
Status: Checkpoint
Last activity: 2026-02-15 -- Completed 01-05 Task 1; awaiting human verification

Progress: [██░░░░░░░░] 10%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 7min
- Total execution time: 0.55 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 5/5 | 33min | 7min |

**Recent Trend:**
- Last 5 plans: 14min, 4min, 6min, 5min, 4min
- Trend: improving

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Web + PWA first launch strategy; native app store releases in later phase
- [Roadmap]: Supabase Realtime Broadcast for ephemeral data (location, typing) from day one per research
- [01-01]: Used Zod v3.25 (not v4.3) -- stable API, v4 was speculative
- [01-01]: expo-router v6 for SDK 54 (not v5 from plan); corrected all Expo package versions
- [01-01]: Tailwind v4 for web, v3 for mobile (NativeWind constraint confirmed)
- [01-02]: Enabled SMS signup with test OTP for local dev; production uses Send SMS Hook via AWS SNS
- [01-02]: Used getUser() in middleware (not getClaims()) -- proven pattern per research
- [01-02]: Added .env.local.example exception to web .gitignore
- [01-03]: Used Supabase OAuth redirect for web social auth instead of dedicated SDK components
- [01-03]: Mobile social auth buttons with TODO for native SDK config; signInWithIdToken API is correct
- [01-03]: Auth gate uses getUser() for initial validation, getSession() only after user confirmed valid
- [01-04]: Used inline style props with design tokens for mobile (not only NativeWind classes) for exact palette colors
- [01-04]: Web nav split: server component layout (auth check) + client component app-nav.tsx (active state)
- [01-04]: ColorTokens type uses {[K]: string} instead of literal types for light/dark union compatibility
- [01-05]: Web onboarding skips location permission -- browser prompts contextually when needed
- [01-05]: Onboarding completion stored client-side (AsyncStorage/localStorage) -- no server round-trip
- [01-05]: Web app layout detects onboarding path via header check for nav-free rendering

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Expo SDK 54 + Next.js 16 + Turborepo combination has limited community examples; may encounter tooling issues in Phase 1 -- RESOLVED in 01-01: combination works, both apps build and start
- [Research]: NativeWind v4.1 requires Tailwind CSS v3 (web can use v4 independently); version alignment needed -- RESOLVED in 01-01: Tailwind v4 web / v3 mobile confirmed working

## Session Continuity

Last session: 2026-02-15
Stopped at: 01-05-PLAN.md Task 2 checkpoint:human-verify (Task 1 complete, awaiting user verification of Phase 1)
Resume file: .planning/phases/01-foundation-auth/01-05-SUMMARY.md
