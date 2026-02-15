# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Drivers and passengers can find each other for shared rides quickly and effortlessly -- simpler, more trustworthy, and completely free.
**Current focus:** Phase 4 - Booking & Ride Management

## Current Position

Phase: 4 of 11 (Booking & Ride Management)
Plan: 5 of 5 in current phase
Status: Phase Complete
Last activity: 2026-02-15 -- Completed 04-05 (ride completion & driver reliability)

Progress: [████████░░] 36%

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: 5min
- Total execution time: 1.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 5/5 | 33min | 7min |
| 02-profiles-identity | 5/5 | 28min | 6min |

**Recent Trend:**
- Last 5 plans: 3min, 7min, 8min, 4min, 6min
- Trend: improving

*Updated after each plan completion*
| Phase 03 P01 | 3min | 2 tasks | 8 files |
| Phase 03 P02 | 2min | 2 tasks | 9 files |
| Phase 03 P04 | 7min | 2 tasks | 10 files |
| Phase 03 P05 | 4min | 2 tasks | 4 files |
| Phase 03 P06 | 4min | 2 tasks | 6 files |
| Phase 03 P07 | 4min | 2 tasks | 6 files |
| Phase 04 P01 | 3min | 2 tasks | 7 files |
| Phase 04 P02 | 5min | 2 tasks | 6 files |
| Phase 04 P03 | 6min | 2 tasks | 4 files |
| Phase 04 P04 | 5min | 2 tasks | 3 files |
| Phase 04 P05 | 4min | 2 tasks | 4 files |

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
- [02-04]: ID documents stored in avatars bucket under userId/id-document path -- private bucket in polish phase
- [02-04]: ID upload auto-verifies (id_verified=true) -- production requires admin review
- [02-04]: Public profile fetches phone verification via is_phone_verified RPC in parallel with profile data
- [02-05]: Separate PROFILE_ONBOARDING_COMPLETED_KEY for backward compat -- existing users keep their completed state but see new profile steps
- [02-05]: Mobile vehicle photo upload offered via Alert after save (consistent with 02-03 pattern)
- [02-05]: FlatList Option A: scrollEnabled disabled for form steps, re-enabled for passive steps
- [03-03]: Added coordinate range validation and 502 status for upstream Google API errors
- [03-03]: CORS headers on all Edge Function responses including errors for web client compatibility
- [Phase 03]: PostGIS functions use extensions. prefix throughout (ST_DWithin, ST_Distance, ST_MakePoint, ST_SetSRID) per Supabase requirement
- [Phase 03]: pg_cron extension enabled explicitly in migration (not pre-installed on Supabase hosted)
- [Phase 03]: nearby_rides RPC falls back to point matching when route_geometry is NULL
- [Phase 03-02]: Added @supabase/supabase-js to shared package for typed query builders (SupabaseClient<Database> pattern)
- [Phase 03-02]: PostGIS geography columns typed as unknown (opaque binary format); NearbyRideResult derived from Database Functions type
- [03-04]: GoogleMapsProvider wraps entire app layout for consistent Maps/Places availability
- [03-04]: AddressAutocomplete backward-compat with onSelect/label props for existing search-form consumers
- [03-04]: PostGIS geography columns inserted via WKT text strings (POINT, LINESTRING) -- no RPC needed
- [03-04]: AdvancedMarkerElement used for map pins (future-proof vs legacy Marker)
- [03-05]: Client-side filtering on RPC results for price/mode/seats refinement; RPC handles spatial filtering
- [03-05]: URL search params persist coordinates and date for shareable/bookmarkable searches
- [03-05]: Skeleton cards as loading state instead of spinner for better perceived performance
- [03-06]: PostGIS geography parsed via WKT regex with GeoJSON fallback for coordinate extraction
- [03-06]: EditRideForm only recomputes route when origin/destination actually changes (routeChanged flag)
- [03-06]: My Rides fetches all driver rides at once and filters client-side into upcoming/past tabs
- [03-07]: FAB positioned bottom-20 on mobile (above bottom nav) and bottom-8 on desktop
- [03-07]: Favorite routes match by address string (not coordinates) for deduplication simplicity
- [03-07]: Skipped Share button on ride-detail.tsx since 03-06 runs in parallel
- [03-07]: Recurring ride form uses local state (not react-hook-form) for simpler one-off page
- [04-01]: All booking mutations via SECURITY DEFINER RPCs -- no direct INSERT/UPDATE/DELETE RLS policies
- [04-01]: expire_past_rides collects expired ride IDs into array first, then batch-updates bookings
- [04-02]: Installed sonner for toast notifications (no existing toast library); Toaster in app layout
- [04-02]: PostgREST FK hint !bookings_passenger_id_fkey for profiles disambiguation (passenger_id vs cancelled_by)
- [04-03]: ManageRideContent as separate client component for clean server/client split
- [04-03]: Manage Bookings link shown when booking_mode is 'request' OR any pending bookings exist
- [04-04]: CancellationDialog handles both booking and ride cancellation via type prop -- single reusable component
- [04-04]: Removed direct updateRide cancel in favor of cancel_ride RPC for proper cascading and reason tracking
- [04-05]: Reliability data fetched server-side on ride detail page to avoid client-side waterfall
- [04-05]: Cancellation rate color coding: green <= 10%, amber 10-20%, red > 20%
- [04-05]: Two-step confirm pattern for ride completion (consistent with cancel flow)
- [04-05]: Manage page redirects to ride detail after completion (manage actions no longer relevant)

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
Stopped at: Completed 04-05-PLAN.md (ride completion & driver reliability) -- Phase 4 complete
Resume file: None
