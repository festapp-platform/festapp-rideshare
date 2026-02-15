# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Drivers and passengers can find each other for shared rides quickly and effortlessly -- simpler, more trustworthy, and completely free.
**Current focus:** Phase 2 - Profiles & Identity

## Current Position

Phase: 2 of 11 (Profiles & Identity)
Plan: 5 of 5 in current phase
Status: Executing (02-04 running in parallel)
Last activity: 2026-02-15 -- Completed 02-05 (profile onboarding extension)

Progress: [███░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 6min
- Total execution time: 0.9 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 5/5 | 33min | 7min |
| 02-profiles-identity | 4/5 | 22min | 6min |

**Recent Trend:**
- Last 5 plans: 4min, 3min, 7min, 8min, 4min
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
- [02-01]: DisplayNameSchema moved from auth.ts to profile.ts as single source of truth; re-exported from auth.ts
- [02-01]: is_phone_verified derives from auth.users (no duplicated column) per research pitfall #4
- [02-01]: Storage path helpers use Date.now() suffix for CDN cache-busting
- [02-02]: Web avatar upload uses browser-image-compression with useWebWorker for non-blocking compression
- [02-02]: Mobile uses Controller pattern from react-hook-form for TextInput (not register) for proper RN integration
- [02-02]: Avatar upload on web previews locally, uploads on save; mobile uploads immediately on pick
- [02-03]: Mobile photo upload offered after save (vehicle ID needed for storage path); web uploads inline
- [02-03]: Web inline confirm-on-second-click for delete; mobile uses native Alert dialog
- [02-05]: Separate PROFILE_ONBOARDING_COMPLETED_KEY for backward compat -- existing users keep their completed state but see new profile steps
- [02-05]: Mobile vehicle photo upload offered via Alert after save (consistent with 02-03 pattern)
- [02-05]: FlatList Option A: scrollEnabled disabled for form steps, re-enabled for passive steps

### Pending Todos

- [ ] Landing page: initial page explaining what the app is about, with anonymised rides visible to non-authenticated users
- [ ] SMTP: configure same SMTP as akhweb project (waiting for credentials from user)
- [ ] Prettier dialogs: delete account confirmation and other modals (polish phase)
- [ ] Supabase project linked: `xamctptqmpruhovhjcgm` (rideshare) on rawen.dev 2, migrations pushed

### Blockers/Concerns

- [Research]: Expo SDK 54 + Next.js 16 + Turborepo combination has limited community examples; may encounter tooling issues in Phase 1 -- RESOLVED in 01-01: combination works, both apps build and start
- [Research]: NativeWind v4.1 requires Tailwind CSS v3 (web can use v4 independently); version alignment needed -- RESOLVED in 01-01: Tailwind v4 web / v3 mobile confirmed working

## Session Continuity

Last session: 2026-02-15
Stopped at: Completed 02-05-PLAN.md (profile onboarding extension)
Resume file: None
