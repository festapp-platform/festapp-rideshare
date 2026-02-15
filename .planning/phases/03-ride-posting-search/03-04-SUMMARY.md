---
phase: 03-ride-posting-search
plan: 04
subsystem: ui
tags: [google-maps, places-api, react-hook-form, zod, postgis, polyline, supabase-edge-functions]

# Dependency graph
requires:
  - phase: 03-01
    provides: rides table with PostGIS geography columns, RLS policies
  - phase: 03-02
    provides: createRide query builder, CreateRideSchema, pricing constants
  - phase: 03-03
    provides: compute-route Edge Function for distance/duration/polyline
provides:
  - Ride posting form at /rides/new with address autocomplete
  - GoogleMapsProvider wrapping app layout for Maps/Places libraries
  - AddressAutocomplete component using Places API (New) with CZ/SK bias
  - RideMap component for route polyline display
  - RideForm with route computation, price suggestion, and database insertion
affects: [03-05-ride-detail, 03-06-search, 03-07-my-rides]

# Tech tracking
tech-stack:
  added: ["@vis.gl/react-google-maps", "@googlemaps/polyline-codec", "date-fns"]
  patterns: [google-maps-provider-wrapper, places-api-new-autocomplete, postgis-wkt-insertion, edge-function-route-computation]

key-files:
  created:
    - apps/web/lib/google-maps-provider.tsx
    - apps/web/app/(app)/components/ride-form.tsx
    - apps/web/app/(app)/components/ride-map.tsx
    - apps/web/app/(app)/rides/new/page.tsx
  modified:
    - apps/web/app/(app)/components/address-autocomplete.tsx
    - apps/web/app/(app)/layout.tsx
    - apps/web/.env.local.example

key-decisions:
  - "GoogleMapsProvider wraps entire app layout (not just ride pages) for consistent Maps/Places availability"
  - "AddressAutocomplete enhanced with backward-compatible onSelect/label props for existing search-form consumers"
  - "PostGIS geography columns inserted via WKT text strings (POINT, LINESTRING) which auto-cast -- no RPC needed"
  - "Haversine fallback for price estimation when compute-route Edge Function is unavailable"
  - "AdvancedMarkerElement used for map pins (future-proof vs legacy Marker)"

patterns-established:
  - "WKT insertion pattern: POINT(lng lat) and LINESTRING(lng lat, ...) text auto-cast to PostGIS geography"
  - "Edge Function invocation: supabase.functions.invoke('compute-route', { body }) for server-side Google API calls"
  - "Price slider with min/max bounds from route computation response"

# Metrics
duration: 7min
completed: 2026-02-15
---

# Phase 3 Plan 4: Ride Posting Form Summary

**Ride posting form with Google Places autocomplete, route map display, price suggestion slider, and PostGIS WKT insertion at /rides/new**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-15T17:35:08Z
- **Completed:** 2026-02-15T17:41:39Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Google Maps provider wrapping app layout with Places library for autocomplete
- Enhanced AddressAutocomplete component using Places API (New) fetchAutocompleteSuggestions with CZ/SK region bias
- Ride posting form with route computation, polyline map display, and adjustable price slider
- PostGIS-compatible ride insertion using WKT text for geography columns

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Google Maps dependencies and create Maps provider + autocomplete** - `3323d77` (feat)
2. **Task 2: Create ride posting form, map component, and /rides/new page** - `aa65255` (feat)

## Files Created/Modified
- `apps/web/lib/google-maps-provider.tsx` - APIProvider wrapper loading Places library
- `apps/web/app/(app)/components/address-autocomplete.tsx` - Enhanced Places API (New) autocomplete with useMapsLibrary, click-outside, loading state
- `apps/web/app/(app)/components/ride-form.tsx` - Full ride posting form with route computation, price slider, all fields
- `apps/web/app/(app)/components/ride-map.tsx` - Google Map with decoded polyline and AdvancedMarkerElement pins
- `apps/web/app/(app)/rides/new/page.tsx` - Server component page with auth check
- `apps/web/app/(app)/layout.tsx` - Wrapped with GoogleMapsProvider
- `apps/web/.env.local.example` - Added NEXT_PUBLIC_GOOGLE_MAPS_API_KEY placeholder
- `apps/web/package.json` - Added @vis.gl/react-google-maps, @googlemaps/polyline-codec, date-fns
- `packages/shared/package.json` - Added date-fns
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- GoogleMapsProvider wraps entire app layout so Maps/Places are available on all pages (search, detail, posting)
- AddressAutocomplete maintained backward compat with `onSelect` and `label` props from the 03-03 search-form consumer
- PostGIS geography columns populated via WKT text strings that auto-cast (simplest approach, no RPC needed)
- Haversine distance as fallback for price estimation when Edge Function call fails
- Used AdvancedMarkerElement (not legacy google.maps.Marker) for future-proofing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed useRef initialization for TypeScript strict mode**
- **Found during:** Task 1 (AddressAutocomplete)
- **Issue:** `useRef<ReturnType<typeof setTimeout>>()` without initial arg fails in React 19 strict types
- **Fix:** Changed to `useRef<ReturnType<typeof setTimeout> | undefined>(undefined)`
- **Files modified:** apps/web/app/(app)/components/address-autocomplete.tsx
- **Verification:** Typecheck passes
- **Committed in:** 3323d77

**2. [Rule 1 - Bug] Fixed createRide query builder await pattern**
- **Found during:** Task 2 (RideForm submission)
- **Issue:** `createRide()` returns a PostgrestBuilder, not a destructured result -- needed await
- **Fix:** Added `await` before `createRide()` call for proper promise resolution
- **Files modified:** apps/web/app/(app)/components/ride-form.tsx
- **Verification:** Typecheck passes
- **Committed in:** aa65255

**3. [Rule 1 - Bug] Replaced require() with ES import for polyline codec**
- **Found during:** Task 2 (encodedPolylineToWKT helper)
- **Issue:** `require("@googlemaps/polyline-codec")` is not valid in ESM client component
- **Fix:** Added top-level `import { decode as decodePolyline }` and used it in the function
- **Files modified:** apps/web/app/(app)/components/ride-form.tsx
- **Verification:** Build passes
- **Committed in:** aa65255

**4. [Rule 3 - Blocking] Included uncommitted components from prior plans**
- **Found during:** Task 1 (staging)
- **Issue:** search-form.tsx and ride-card.tsx from plan 03-03 were never committed (entire components dir was untracked)
- **Fix:** Included them in Task 1 commit to avoid broken git state
- **Files modified:** apps/web/app/(app)/components/search-form.tsx, ride-card.tsx
- **Verification:** Build passes, no orphaned files
- **Committed in:** 3323d77

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for correct compilation and runtime behavior. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations.

## User Setup Required
Google Maps API key must be set in `apps/web/.env.local`:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```
Without this key, the app builds and renders but autocomplete and map features will not function.

## Next Phase Readiness
- Ride posting form complete and functional at /rides/new
- Route computation integration tested via typecheck and build
- Map and autocomplete components ready for reuse in search results (03-06) and ride detail (03-05)
- Full functional testing requires Google Maps API key configuration

---
*Phase: 03-ride-posting-search*
*Completed: 2026-02-15*
