# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Drivers and passengers can find each other for shared rides quickly and effortlessly -- simpler, more trustworthy, and completely free.
**Current focus:** Phase 1 - Foundation & Auth

## Current Position

Phase: 1 of 10 (Foundation & Auth)
Plan: 3 of 5 in current phase
Status: Executing
Last activity: 2026-02-15 -- Completed 01-03 Auth flows

Progress: [██░░░░░░░░] 6%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 8min
- Total execution time: 0.40 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 3/5 | 24min | 8min |

**Recent Trend:**
- Last 5 plans: 14min, 4min, 6min
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

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Expo SDK 54 + Next.js 16 + Turborepo combination has limited community examples; may encounter tooling issues in Phase 1 -- RESOLVED in 01-01: combination works, both apps build and start
- [Research]: NativeWind v4.1 requires Tailwind CSS v3 (web can use v4 independently); version alignment needed -- RESOLVED in 01-01: Tailwind v4 web / v3 mobile confirmed working

## Session Continuity

Last session: 2026-02-15
Stopped at: Completed 01-03-PLAN.md (Auth flows)
Resume file: .planning/phases/01-foundation-auth/01-03-SUMMARY.md
