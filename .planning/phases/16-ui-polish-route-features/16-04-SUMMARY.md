---
phase: 16-ui-polish-route-features
plan: 04
subsystem: ui
tags: [waypoints, leaflet, google-maps, ride-form, route-map, supabase]

requires:
  - phase: 16-01
    provides: MapLocationPicker with initialLat/initialLng props
  - phase: 16-03
    provides: ride_waypoints table with GIST index and getRideWaypoints query
provides:
  - Waypoint input UI in ride creation form (max 5, AddressInput-based)
  - Sequential waypoint insert to ride_waypoints after ride creation
  - Blue circle markers on Leaflet and Google Maps route displays
  - Waypoint data flow from ride detail page to route map components
affects: []

tech-stack:
  added: []
  patterns:
    - "Waypoint insert after ride creation with warn-on-failure pattern"
    - "Blue circleMarker for waypoints (fillColor #3B82F6, color #2563EB, radius 8)"

key-files:
  created: []
  modified:
    - apps/web/app/(app)/components/ride-form.tsx
    - apps/web/app/(app)/components/route-map.tsx
    - apps/web/app/(app)/components/ride-map-mapy.tsx
    - apps/web/app/(app)/components/ride-map.tsx
    - apps/web/app/(app)/components/ride-detail.tsx
    - apps/web/lib/i18n/translations.ts

key-decisions:
  - "Waypoint insert uses try/catch per-waypoint with console.warn on failure (non-blocking)"
  - "parseWaypointLocation helper in ride-detail.tsx handles both WKT and GeoJSON formats"

patterns-established:
  - "WaypointMarker interface {lat, lng, address} shared across route-map, ride-map, ride-map-mapy"

requirements-completed: [ROUTE-01, ROUTE-02]

duration: 4min
completed: 2026-02-17
---

# Phase 16 Plan 04: Waypoints Summary

**Waypoint input UI (max 5) in ride creation form with blue circle markers on Leaflet and Google Maps route displays**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-16T23:59:49Z
- **Completed:** 2026-02-17T00:03:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Waypoint input UI with add/remove in ride form Step 0 (Route), max 5 waypoints enforced
- Sequential insert to ride_waypoints table after ride creation with non-blocking failure handling
- Blue circle markers on Leaflet maps (L.circleMarker with tooltip) and Google Maps (AdvancedMarkerElement)
- Waypoint data flows from ride detail page through RouteMap to both map implementations
- Translation keys added for cs/sk/en (waypoints, addWaypoint, removeWaypoint, maxWaypoints, waypointPlaceholder)

## Task Commits

Each task was committed atomically:

1. **Task 1: Waypoint input UI in ride creation form** - `e8eb071` (feat)
2. **Task 2: Display waypoint markers on route maps** - `1338fca` (feat)

## Files Created/Modified
- `apps/web/app/(app)/components/ride-form.tsx` - WaypointInput state, AddressInput-based waypoint list, sequential insert after ride creation
- `apps/web/app/(app)/components/route-map.tsx` - Extended RouteMapProps with optional waypoints, passes through to map implementations
- `apps/web/app/(app)/components/ride-map-mapy.tsx` - Blue L.circleMarker for each waypoint with address tooltip, bounds extension
- `apps/web/app/(app)/components/ride-map.tsx` - Blue AdvancedMarkerElement circles for waypoints with address title, bounds extension
- `apps/web/app/(app)/components/ride-detail.tsx` - parseWaypointLocation helper, mapWaypoints transformation, passes waypoints to RouteMap
- `apps/web/lib/i18n/translations.ts` - cs/sk/en translation keys for waypoint UI

## Decisions Made
- Waypoint insert uses try/catch per-waypoint with console.warn on failure -- non-blocking so ride creation succeeds even if a waypoint insert fails
- parseWaypointLocation helper in ride-detail.tsx handles both WKT POINT(lng lat) and GeoJSON {coordinates:[lng,lat]} formats for flexibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 16 is complete (all 4 plans executed)
- Waypoint input and display fully functional
- No blockers for subsequent work

---
*Phase: 16-ui-polish-route-features*
*Completed: 2026-02-17*
