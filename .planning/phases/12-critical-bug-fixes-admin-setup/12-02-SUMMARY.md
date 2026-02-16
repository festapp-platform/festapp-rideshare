---
phase: 12-critical-bug-fixes-admin-setup
plan: 02
subsystem: ui
tags: [react-hook-form, geocoding, mapy-cz, wizard-form, ai-assistant]

requires:
  - phase: 09-ai-assistant
    provides: AI assistant Edge Function with create_ride intent parsing
provides:
  - forwardGeocode helper for Mapy.cz geocode API in ride form
  - AI ride creation with geocoded origin/destination and all form fields pre-filled
  - shouldUnregister:false for wizard step value persistence
affects: [14-ride-search-pricing, 16-ux-polish]

tech-stack:
  added: []
  patterns: [forward-geocoding-bridge, parallel-geocode-promise-all]

key-files:
  created: []
  modified:
    - apps/web/app/(app)/components/ride-form.tsx

key-decisions:
  - "forwardGeocode as module-level function (not inside component) for reusability"
  - "Parallel geocoding with Promise.all for origin and destination simultaneously"
  - "Graceful degradation: geocoding failure still sets other AI-parsed fields (date, time, seats, price)"

patterns-established:
  - "Forward geocoding bridge: Mapy.cz /v1/geocode API with lon->lng mapping for PlaceResult compatibility"

requirements-completed: [BUG-01]

duration: 2min
completed: 2026-02-16
---

# Phase 12 Plan 02: AI Ride Creation Fix Summary

**Forward geocoding bridge (Mapy.cz) converts AI address strings to PlaceResult objects, enabling full form pre-fill from natural language input with shouldUnregister:false preserving values across wizard steps**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T21:45:18Z
- **Completed:** 2026-02-16T21:47:35Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added `shouldUnregister: false` to useForm config so AI-set values persist across wizard step navigation
- Created `forwardGeocode` helper that converts address strings to PlaceResult via Mapy.cz geocode API with correct `lon` to `lng` mapping
- Updated `handleAiPrompt` to geocode origin/destination in parallel and call `setOrigin`/`setDestination`, triggering automatic route computation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add shouldUnregister:false and forwardGeocode helper** - `05b39b6` (feat)
2. **Task 2: Update handleAiPrompt to use forwardGeocode and set all form fields** - `31c2489` (feat)

## Files Created/Modified
- `apps/web/app/(app)/components/ride-form.tsx` - Added forwardGeocode helper, shouldUnregister:false, and enhanced handleAiPrompt with geocoding

## Decisions Made
- forwardGeocode placed at module level (not inside component) since PlaceResult and MAPY_API_KEY are module-scoped
- Used Promise.all for parallel geocoding of origin and destination (faster than sequential)
- Graceful degradation: if geocoding fails for one address, other fields still get set; if API key missing, forwardGeocode returns null immediately

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. NEXT_PUBLIC_MAPY_CZ_API_KEY already used by existing AddressAutocompleteMapy component.

## Next Phase Readiness
- ride-form.tsx ready for Phase 14 (pricing) and Phase 16 (UX polish) modifications
- AI ride creation flow fully functional with geocoded addresses and route computation

---
*Phase: 12-critical-bug-fixes-admin-setup*
*Completed: 2026-02-16*
