---
phase: 03-ride-posting-search
plan: 03
subsystem: api
tags: [google-routes-api, edge-function, supabase, deno, pricing, geospatial]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: Supabase Edge Function shared utilities (_shared/supabase-client.ts)
provides:
  - compute-route Edge Function (Google Routes API proxy with price suggestion)
affects: [03-ride-posting-search, 04-booking-communication]

# Tech tracking
tech-stack:
  added: [Google Routes API]
  patterns: [CORS-enabled Edge Function, server-side API key proxy, fuel-cost price suggestion]

key-files:
  created:
    - supabase/functions/compute-route/index.ts
  modified: []

key-decisions:
  - "Added coordinate range validation (lat -90..90, lng -180..180) beyond plan spec"
  - "Added 502 status for Google API errors vs 500 for internal errors"
  - "CORS headers on all responses including errors for web client compatibility"

patterns-established:
  - "CORS-enabled Edge Function pattern: corsHeaders object spread into all responses"
  - "Price suggestion formula: fuelCost * 0.6 sharing factor, min 20 CZK floor"

# Metrics
duration: 1min
completed: 2026-02-15
---

# Phase 3 Plan 3: Compute Route Edge Function Summary

**Google Routes API proxy Edge Function with auth gating, CORS, coordinate validation, and Czech fuel-cost price suggestion**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-15T18:29:29Z
- **Completed:** 2026-02-15T18:30:22Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Deployed compute-route Edge Function that proxies Google Routes API server-side
- Returns distanceMeters, durationSeconds, encodedPolyline, suggestedPriceCzk, priceMinCzk, priceMaxCzk
- Auth-gated to authenticated users only via Supabase user client
- CORS handling for web client requests
- Price suggestion with configurable fuel cost env vars and 0.6 cost-sharing factor

## Task Commits

Each task was committed atomically:

1. **Task 1: Create compute-route Edge Function** - `588f9d9` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `supabase/functions/compute-route/index.ts` - Edge Function: Google Routes API proxy with auth, CORS, validation, price suggestion

## Decisions Made
- Added coordinate range validation (lat -90..90, lng -180..180) as Rule 2 (input validation)
- Used 502 status for upstream Google API errors to distinguish from internal 500 errors
- Applied CORS headers to all responses (including errors) for consistent web client behavior

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added coordinate range validation**
- **Found during:** Task 1 (Edge Function creation)
- **Issue:** Plan specified "validate all 4 are numbers" but did not include range checks
- **Fix:** Added lat (-90 to 90) and lng (-180 to 180) range validation
- **Files modified:** supabase/functions/compute-route/index.ts
- **Verification:** Function deployed successfully
- **Committed in:** 588f9d9 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added upstream API error handling (502)**
- **Found during:** Task 1 (Edge Function creation)
- **Issue:** Plan pattern did not check routesResponse.ok before parsing
- **Fix:** Added check for non-OK responses from Google API, returns 502 with error message
- **Files modified:** supabase/functions/compute-route/index.ts
- **Verification:** Function deployed successfully
- **Committed in:** 588f9d9 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both fixes improve input validation and error handling. No scope creep.

## Issues Encountered
None

## User Setup Required

Google Routes API key must be configured before the function can compute routes:
- Set Supabase secret: `supabase secrets set GOOGLE_ROUTES_API_KEY=<your-key>`
- Enable Routes API in Google Cloud Console
- Without the key, the function returns 500 with "Route computation is not configured"

## Next Phase Readiness
- compute-route Edge Function deployed and ready for ride posting form integration
- Next plans in phase can call the function from web/mobile clients
- Google API key setup is a prerequisite for end-to-end testing

---
*Phase: 03-ride-posting-search*
*Completed: 2026-02-15*
