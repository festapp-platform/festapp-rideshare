# Technology Stack: v1.1 UX Improvements & Bug Fixes

**Project:** festapp-rideshare (spolujizda.online)
**Researched:** 2026-02-16
**Scope:** Stack additions/changes for v1.1 features only

## Executive Summary

v1.1 requires **zero new dependencies**. Every feature can be implemented with the existing stack plus built-in browser APIs. The key technical work involves using Google Maps JavaScript API capabilities already loaded via `@vis.gl/react-google-maps`, leveraging `Intl.NumberFormat` (built into all browsers), and improving the existing Supabase Realtime deduplication pattern.

---

## Feature-by-Stack Mapping

### 1. Route Alternatives Display

**Stack:** Google Routes API v2 (backend) + `@vis.gl/react-google-maps` ^1.7.1 (frontend)
**New dependencies:** None

**Backend change (Edge Function `compute-route`):**

The existing `computeRouteGoogle()` function calls `routes.googleapis.com/directions/v2:computeRoutes`. To get alternatives, add two fields:

```typescript
// In compute-route/index.ts — computeRouteGoogle()
body: JSON.stringify({
  origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
  destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
  travelMode: "DRIVE",
  routingPreference: "TRAFFIC_AWARE",
  computeAlternativeRoutes: true,  // NEW: request up to 3 alternatives
}),
headers: {
  "X-Goog-FieldMask":
    "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.routeLabels",  // ADD: routeLabels
},
```

**Key constraints (HIGH confidence, official docs):**
- Returns up to 3 alternative routes plus the default (4 total max)
- Each route has a `routeLabels` array: `"DEFAULT_ROUTE"` or `"DEFAULT_ROUTE_ALTERNATE"`
- **Alternative routes CANNOT have intermediate waypoints** — this means route alternatives and waypoints are mutually exclusive features
- Increases response time slightly
- Mapy.cz provider does NOT support alternatives — Google-only feature

**Frontend change:**
The existing `RideMap` component draws a single polyline. Extend to accept an array of encoded polylines and render alternatives as semi-transparent lines behind the selected route. Use the existing `google.maps.Polyline` class (already in use) with different `strokeOpacity` and `strokeColor` for alternatives.

**Source:** [Google Routes API - Alternative Routes](https://developers.google.com/maps/documentation/routes/alternative-routes)

---

### 2. Draggable/Editable Routes with Waypoints

**Stack:** Google Maps JavaScript API `DirectionsService` + `DirectionsRenderer` via `@vis.gl/react-google-maps` hooks
**New dependencies:** None

**Implementation approach — use `DirectionsService`, NOT Routes API v2:**

The Google Maps JavaScript API `DirectionsService` (client-side) supports draggable route rendering natively via `DirectionsRenderer({ draggable: true })`. This is the correct approach for interactive route editing because:

1. `DirectionsRenderer` handles drag UX, waypoint insertion, and re-routing automatically
2. The Routes API v2 (used in the Edge Function) is a server-side REST API with no drag support
3. `@vis.gl/react-google-maps` already provides the hooks needed: `useMap()` and `useMapsLibrary('routes')`

```typescript
// Pattern from @vis.gl/react-google-maps examples
const map = useMap();
const routesLibrary = useMapsLibrary('routes');

// Initialize when library loads
const directionsService = new routesLibrary.DirectionsService();
const directionsRenderer = new routesLibrary.DirectionsRenderer({
  draggable: true,
  map,
});

// Listen for drag changes
directionsRenderer.addListener('directions_changed', () => {
  const directions = directionsRenderer.getDirections();
  // Extract waypoints, recalculate distance/price
});
```

**Key constraints (HIGH confidence, official docs):**
- Max 23 intermediate waypoints (plus origin + destination = 25 total)
- 11+ intermediate waypoints = higher billing tier
- `DirectionsService` is the Legacy Directions API — different billing from Routes API v2
- Must load `routes` library in `GoogleMapsProvider` (currently only loads `places`)

**GoogleMapsProvider update needed:**
```typescript
// Current:  libraries={["places"]}
// Updated:  libraries={["places", "routes"]}
```

**Important: routes library is NOT the same as geometry library.** The `routes` library provides `DirectionsService` and `DirectionsRenderer`. The `geometry` library (not currently loaded) provides `encoding.decodePath()` — but the project already uses `@googlemaps/polyline-codec` for decoding, so geometry library is not needed.

**Waypoints data model:** The Edge Function should accept an optional `intermediates` array and pass it to Routes API v2 for server-side route computation (non-interactive). For the interactive drag experience, use client-side `DirectionsService`.

**Source:** [Google Maps Draggable Directions](https://developers.google.com/maps/documentation/javascript/examples/directions-draggable), [@vis.gl/react-google-maps Directions Example](https://github.com/visgl/react-google-maps/blob/main/examples/directions/src/app.tsx)

---

### 3. Chat Message Deduplication

**Stack:** Supabase Realtime `postgres_changes` (existing) + client-side ID-based dedup (existing, needs hardening)
**New dependencies:** None

**Current state analysis:**

The existing `ChatView` already implements optimistic updates with UUID deduplication:
- `handleSendMessage` generates `crypto.randomUUID()` for optimistic message
- `postgres_changes` INSERT handler checks `prev.some(m => m.id === newMsg.id)` to deduplicate
- If found, replaces optimistic message with server version; if not found, appends

**The problem:** The optimistic message ID (`crypto.randomUUID()`) will NEVER match the server-generated ID (from `send_chat_message` RPC). This means:
1. Optimistic message is added with client UUID
2. Server INSERT triggers Realtime event with server-generated UUID
3. Dedup check fails (`prev.some(m => m.id === newMsg.id)` — different IDs)
4. Duplicate message appears

**Fix approach — no new dependencies needed:**

Option A (recommended): Have `send_chat_message` RPC accept a client-provided UUID as the message ID (use `crypto.randomUUID()` which generates valid UUIDv4). Then optimistic and server IDs match.

Option B: Track a `pending` flag on optimistic messages and match by `(conversation_id, sender_id, content, ~timestamp)` to replace pending messages when the server version arrives.

**Supabase Realtime guarantees (MEDIUM confidence):**
- Supabase Realtime does NOT guarantee exactly-once delivery
- Messages can arrive duplicated due to reconnection, WAL replay
- Client-side deduplication by message ID is the recommended pattern
- The current ID-based check is correct in principle but broken by ID mismatch

**Source:** [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Supabase Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture)

---

### 4. Map Picker Improvements (Zoom, Click Handling)

**Stack:** Leaflet ^1.9.4 + react-leaflet ^5.0.0 (existing)
**New dependencies:** None

**Current state:** `MapLocationPicker` uses Leaflet with Mapy.cz tiles. Works but has reported UX issues with zoom and click handling.

**Improvements possible with existing Leaflet API:**
- **Zoom control position:** `L.map(el, { zoomControl: false })` then `L.control.zoom({ position: 'topright' }).addTo(map)` for mobile-friendly placement
- **Double-click zoom vs selection:** Use `map.doubleClickZoom.disable()` to prevent accidental zoom when tapping to select, or add a debounce to distinguish clicks from double-clicks
- **Touch handling:** Leaflet supports `tap: true` and `touchZoom: true` by default. If touch selection is problematic, consider using `map.on('contextmenu')` for long-press on mobile
- **Initial zoom:** Current default zoom 7 (whole Czech Republic) — could use geolocation to center on user's location with `map.locate({ setView: true, maxZoom: 13 })`

No library changes needed. All improvements are configuration/event handling within existing Leaflet API.

---

### 5. Price Formatting (Intl.NumberFormat)

**Stack:** Built-in `Intl.NumberFormat` API (no dependency)
**New dependencies:** None

**Current state:** Price is displayed as string interpolation: `` `${ride.price_czk} CZK` `` across 10+ files (ride-card, ride-detail, search, etc.).

**Recommended utility:**

```typescript
// lib/format-price.ts
export function formatPrice(
  priceCzk: number | null,
  locale: string = 'cs',
): string {
  if (priceCzk == null) return 'Zdarma'; // or localized "Free"

  return new Intl.NumberFormat(locale === 'en' ? 'en-CZ' : `${locale}-CZ`, {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceCzk);
}
```

**Behavior by locale (HIGH confidence, built-in API):**
- `cs-CZ`: `150 Kc` (displays with proper Czech formatting and hacek)
- `sk-SK`: `150 CZK` (Slovak uses ISO code for foreign currencies)
- `en-CZ`: `CZK 150` (English convention, symbol first)

**Note:** `Intl.NumberFormat` with `currency: 'CZK'` renders "Kc" (with hacek) in Czech locale, which is the standard symbol. The current "CZK" string is the ISO code, less natural for Czech users.

**Browser support:** Universal (all modern browsers, Node.js 18+). No polyfill needed.

---

### 6. Time Picker with Min Date Constraint

**Stack:** Existing `DateTimePicker` component + date-fns ^4.1.0
**New dependencies:** None

**Current state:** The `DateTimePicker` already prevents past date selection in the calendar (`isBefore(day, today)` disables past days). However, it does NOT constrain the time portion — a user can select today's date but a time that has already passed.

**Fix:** Add time validation logic:
- When selected date is today, filter `HOURS` to show only hours >= current hour
- When selected date is today AND selected hour is current hour, filter `MINUTES` to show only minutes >= current minute
- When selected date is in the future, show all hours/minutes

This is pure logic within the existing component, no new dependencies.

The `confirm-date.tsx` and `events/new/page.tsx` use native `datetime-local` inputs with `min={new Date().toISOString().slice(0, 16)}` — this already works correctly for the min constraint via the HTML spec. No changes needed there.

---

### 7. Global Location Sharing Indicator (Persistent Banner)

**Stack:** React Context (existing pattern) + existing `useLiveLocation` hook
**New dependencies:** None

**Current state:** `useLiveLocation` manages GPS sharing state per-ride. The `isSharing` state is local to the component using the hook.

**Implementation:** Create a React Context (following the existing `useI18n` pattern) that wraps the app layout and tracks whether location sharing is active globally. When active, render a fixed-position banner at the top of the viewport.

```typescript
// Pattern matching existing architecture:
// lib/location-sharing-context.tsx (new file, following lib/i18n/provider.tsx pattern)
```

The banner UI is pure Tailwind CSS. No animation library needed — use `translate-y` transition for slide-in/out.

---

### 8. Cookie Consent i18n

**Stack:** Existing i18n system (`useI18n` + `translations.ts`)
**New dependencies:** None

**Current state:** `CookieConsent` component has hardcoded English strings: "We use cookies for analytics...", "Decline", "Accept".

**Fix:** Replace hardcoded strings with `t()` calls using the existing i18n provider. Add translation keys to `translations.ts` for cs/sk/en.

---

### 9. Terms of Service Checkbox

**Stack:** react-hook-form ^7.71.1 (existing) + Zod (existing via @hookform/resolvers)
**New dependencies:** None

**Current state:** Registration/booking flows use react-hook-form with Zod validation. A ToS page exists at `/terms`.

**Implementation:** Add a `termsAccepted: z.literal(true)` field to the relevant Zod schema. Render a checkbox with a link to `/terms`. The form won't submit unless checked. Store acceptance timestamp in the user's profile for GDPR compliance.

---

## Stack Changes Summary

### New Dependencies Required

**None.** All features use existing dependencies or built-in browser APIs.

### Existing Dependencies — No Version Changes Needed

| Dependency | Current Version | Status |
|------------|----------------|--------|
| `@vis.gl/react-google-maps` | ^1.7.1 | Sufficient. Has `useMap()`, `useMapsLibrary()`, `Polyline` component |
| `@googlemaps/polyline-codec` | ^1.0.28 | Sufficient for decoding route polylines |
| `@supabase/supabase-js` | ^2.95.3 | Sufficient. Realtime with postgres_changes works |
| `date-fns` | ^4.1.0 | Sufficient for time comparison logic |
| `react-hook-form` | ^7.71.1 | Sufficient for ToS checkbox validation |
| `leaflet` | ^1.9.4 | Sufficient for map picker improvements |
| `react-leaflet` | ^5.0.0 | Sufficient |

### Configuration Changes Required

| Change | File | What |
|--------|------|------|
| Load `routes` library | `apps/web/lib/google-maps-provider.tsx` | Add `"routes"` to `libraries` array |
| Return multiple routes | `supabase/functions/compute-route/index.ts` | Add `computeAlternativeRoutes: true` and `routes.routeLabels` to field mask |

### New Files Expected

| File | Purpose |
|------|---------|
| `apps/web/lib/format-price.ts` | `formatPrice()` utility using `Intl.NumberFormat` |
| `apps/web/lib/location-sharing-context.tsx` | Global location sharing state context |

### Files Modified (Key Changes)

| File | Change |
|------|--------|
| `apps/web/lib/google-maps-provider.tsx` | Add `routes` to libraries array |
| `supabase/functions/compute-route/index.ts` | Support alternatives + intermediates |
| `apps/web/app/(app)/components/ride-map.tsx` | Display multiple route polylines |
| `apps/web/app/(app)/messages/components/chat-view.tsx` | Fix dedup (client UUID passed to server RPC) |
| `apps/web/app/(app)/components/map-location-picker.tsx` | Zoom/click UX improvements |
| `apps/web/app/(app)/components/date-time-picker.tsx` | Time min constraint for today |
| `apps/web/components/cookie-consent.tsx` | Replace hardcoded strings with `t()` |
| `apps/web/lib/i18n/translations.ts` | Add cookie consent + ToS translation keys |
| 10+ files with price display | Replace `${price} CZK` with `formatPrice()` |

---

## What NOT to Add

| Temptation | Why Not |
|------------|---------|
| `@react-google-maps/api` | Legacy library. `@vis.gl/react-google-maps` is the official successor and already installed |
| `react-datepicker` or similar | Custom `DateTimePicker` already exists, matches design system, just needs time constraint logic |
| `js-cookie` | Cookie consent uses `localStorage`, not cookies. No change needed |
| Google Maps `geometry` library | Already using `@googlemaps/polyline-codec` for encoding/decoding. Don't load extra library |
| `uuid` package | `crypto.randomUUID()` is built into all modern browsers and already used |
| Separate directions API billing | `DirectionsService` (JS API) costs more per request than Routes API v2. Use it ONLY for interactive draggable routes in the ride creation form, NOT for display-only route rendering |
| `socket.io` or custom WebSocket | Supabase Realtime handles all real-time needs. Dedup is a logic fix, not an infrastructure change |

---

## Billing Considerations

### Google Maps API Cost Impact

| Feature | API | Cost Change |
|---------|-----|-------------|
| Route alternatives | Routes API v2 `computeRoutes` | No extra cost (same request, more data returned) |
| Draggable routes | Directions API (JS client) | NEW cost center. ~$0.005-0.01 per route request. Only triggered during ride creation when user drags |
| Waypoints (11+) | Routes API v2 | Higher tier pricing. Unlikely for ride-sharing (most rides have 0-2 stops) |

**Recommendation:** Use Routes API v2 for all server-side route computation (display, pricing). Use client-side `DirectionsService` ONLY for the interactive drag-to-edit experience during ride creation. This minimizes billing impact.

### Mapy.cz Considerations

The current `compute-route` Edge Function prefers Mapy.cz as the routing provider. Mapy.cz does NOT support:
- Alternative routes
- Intermediate waypoints

For v1.1 features, when alternatives or waypoints are requested, the Edge Function must fall through to Google Routes API regardless of the `ROUTE_PROVIDER` setting.

---

## Sources

- [Google Routes API - Alternative Routes](https://developers.google.com/maps/documentation/routes/alternative-routes) (HIGH confidence)
- [Google Routes API - computeRoutes Reference](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes) (HIGH confidence)
- [Google Routes API - Intermediate Waypoints](https://developers.google.com/maps/documentation/routes/intermed_waypoints) (HIGH confidence)
- [Google Maps JS API - Draggable Directions](https://developers.google.com/maps/documentation/javascript/examples/directions-draggable) (HIGH confidence)
- [@vis.gl/react-google-maps Directions Example](https://github.com/visgl/react-google-maps/blob/main/examples/directions/src/app.tsx) (HIGH confidence)
- [@vis.gl/react-google-maps Polyline Example](https://github.com/visgl/react-google-maps/blob/main/examples/geometry/src/components/polyline.tsx) (HIGH confidence)
- [Supabase Realtime - Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) (HIGH confidence)
- [Supabase Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture) (MEDIUM confidence)
- [MDN Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) (HIGH confidence)
