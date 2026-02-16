# Architecture: v1.1 UX Improvements & Bug Fixes

**Domain:** Feature integration into existing Czech ride-sharing platform
**Researched:** 2026-02-16
**Confidence:** HIGH -- based on direct codebase analysis of all integration points

## Current Architecture Overview

```
apps/web/app/
  layout.tsx                    # Root: I18nProvider wraps everything
  (app)/
    layout.tsx                  # Auth guard, MapProvider, banners stack, AppNav
    components/
      ride-form.tsx             # 3-step wizard: Route > When > Price (react-hook-form)
      ride-map.tsx              # Google Maps polyline renderer (@vis.gl/react-google-maps)
      ride-map-mapy.tsx         # Leaflet+Mapy.cz alternative
      route-map.tsx             # Provider-agnostic wrapper
      ride-card.tsx             # Search result card (inline price formatting)
      ride-detail.tsx           # Full ride view (inline price formatting)
      edit-ride-form.tsx        # Edit existing ride
      live-location-map.tsx     # Real-time driver tracking on Google Maps
      address-input.tsx         # AddressInput component
      map-location-picker.tsx   # Tap-to-pick location overlay
    hooks/
      use-live-location.ts      # Broadcast subscription for GPS sharing
    messages/
      components/chat-view.tsx  # Realtime chat (Postgres Changes + Broadcast)
    assistant/
      actions.ts                # Server actions: sendAiMessage, executeAiAction
      components/
        intent-confirmation.tsx # AI action confirmation card
        chat-interface.tsx      # AI chat UI
  lib/
    i18n/
      translations.ts          # 1106 lines, flat dot-notation keys, 3 locales (cs/sk/en)
      provider.tsx              # I18nProvider context + useI18n hook
    map-provider.tsx            # Provider-agnostic map selection
    supabase/client.ts          # Browser client
    supabase/server.ts          # Server client

supabase/
  functions/compute-route/      # Edge Function: Mapy.cz (primary) + Google Routes (fallback)
  migrations/00000000000002_rides.sql  # rides table + ride_waypoints table (already exists)

packages/shared/
  src/constants/pricing.ts      # PRICING constants, calculateSuggestedPrice
```

## Feature Integration Analysis

### 1. Route Alternatives (Multiple Polylines on Map)

**Scope:** Modify compute-route Edge Function + RideMap component + RideForm state

**What exists:**
- `compute-route/index.ts` calls Google Routes API with `X-Goog-FieldMask` requesting a single route
- `ride-map.tsx` renders one `google.maps.Polyline` and cleans up via refs
- `ride-form.tsx` stores a single `RouteInfo` object in state

**What to change:**

| File | Change | Type |
|------|--------|------|
| `supabase/functions/compute-route/index.ts` | Request `computeAlternativeRoutes: true` in Google Routes body; return array of routes | MODIFY |
| `apps/web/app/(app)/components/ride-map.tsx` | Accept `routes: EncodedPolyline[]` + `selectedIndex`; render multiple polylines with opacity differentiation; handle click-to-select | MODIFY |
| `apps/web/app/(app)/components/ride-map-mapy.tsx` | Same multi-polyline support for Mapy.cz provider | MODIFY |
| `apps/web/app/(app)/components/route-map.tsx` | Pass through new props | MODIFY |
| `apps/web/app/(app)/components/ride-form.tsx` | Store `RouteInfo[]` array; add route selector UI; track `selectedRouteIndex` | MODIFY |

**Data flow:**
```
User sets origin+dest
  -> compute-route returns { routes: [{ distanceMeters, durationSeconds, encodedPolyline, pricing }] }
  -> RideForm stores routes[] in state, selectedRouteIndex = 0
  -> RideMap renders all polylines (selected = solid blue, alternatives = dashed gray)
  -> User clicks alternative polyline -> selectedRouteIndex updates
  -> Price/distance/duration update to match selected route
  -> On submit, only selected route's polyline is saved to rides table
```

**Google Routes API change (in Edge Function):**
```typescript
body: JSON.stringify({
  origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
  destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
  travelMode: "DRIVE",
  routingPreference: "TRAFFIC_AWARE",
  computeAlternativeRoutes: true,  // NEW
}),
// Update FieldMask to include all routes
"X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"
```

**Mapy.cz note:** The Mapy.cz routing API (`api.mapy.cz/v1/routing/route`) does not support alternative routes natively. When using Mapy.cz as primary provider, return a single-element array for consistency. Alternative routes only work when Google is the active provider.

**No schema changes needed.** The rides table stores a single `route_encoded_polyline` -- the selected one at submission time.

---

### 2. Waypoints (Adding/Removing Intermediate Stops)

**Scope:** Ride form UI + compute-route Edge Function + ride display components

**What exists:**
- `ride_waypoints` table already exists in `00000000000002_rides.sql` with `ride_id`, `location`, `address`, `order_index`, `type`
- RLS policies for waypoints already exist (driver can CRUD)
- No UI currently creates or displays waypoints

**What to create vs modify:**

| File | Change | Type |
|------|--------|------|
| `apps/web/app/(app)/components/waypoint-input.tsx` | Sortable list of AddressInput fields with add/remove/reorder | CREATE |
| `apps/web/app/(app)/components/ride-form.tsx` | Add waypoints state array; pass to compute-route; save waypoints after ride insert | MODIFY |
| `supabase/functions/compute-route/index.ts` | Accept `waypoints` array; pass as `intermediates` to Google Routes API | MODIFY |
| `apps/web/app/(app)/components/ride-map.tsx` | Render waypoint markers (numbered yellow dots) between origin and destination | MODIFY |
| `apps/web/app/(app)/components/ride-detail.tsx` | Fetch and display waypoints for a ride | MODIFY |
| `apps/web/app/(app)/components/ride-card.tsx` | Show "via X stops" badge if waypoints exist | MODIFY |
| `packages/shared/src/validation/rides.ts` | Add waypoints to CreateRideSchema (optional array) | MODIFY |

**Compute-route integration (Google Routes API):**
```typescript
body: JSON.stringify({
  origin: { ... },
  destination: { ... },
  intermediates: waypoints.map(wp => ({
    location: { latLng: { latitude: wp.lat, longitude: wp.lng } }
  })),
  travelMode: "DRIVE",
  routingPreference: "TRAFFIC_AWARE",
}),
```

**Mapy.cz integration:** Use `waypoints` parameter: `url.searchParams.set("waypoints", waypoints.map(wp => `${wp.lng},${wp.lat}`).join("|"))`.

**Ride creation flow:**
```
1. Insert ride into rides table (returns ride.id)
2. Bulk insert waypoints into ride_waypoints with order_index
3. Both in a single transaction (or sequential with error handling)
```

**No migration needed** -- the `ride_waypoints` table schema is already correct.

---

### 3. Chat Message Deduplication

**Scope:** Single-file fix in ChatView

**What exists:**
- `chat-view.tsx` lines 77-83: Already has basic dedup (`prev.some(m => m.id === newMsg.id)`)
- Uses optimistic updates with `crypto.randomUUID()` for optimistic IDs (line 143)
- Problem: the optimistic message has a client-generated UUID, the server-side message from Realtime has a different server-generated UUID

**The actual bug:** When a message is sent:
1. Optimistic message added with `optimisticId` (client UUID)
2. Server inserts message via RPC `send_chat_message` which generates its own UUID
3. Postgres Changes fires INSERT with server UUID
4. Dedup check `prev.some(m => m.id === newMsg.id)` fails because IDs differ
5. Message appears twice

**Fix location:** `apps/web/app/(app)/messages/components/chat-view.tsx`

**Fix approach:** Deduplicate by content + sender + timestamp proximity rather than by ID. Or better: have the RPC return the created message ID, then track a `pendingIds` set to correlate optimistic with real messages.

```typescript
// In handleSendMessage, after successful RPC:
// Option A: Content-based dedup (simpler)
.on("postgres_changes", { event: "INSERT", ... }, (payload) => {
  const newMsg = payload.new as Message;
  setMessages((prev) => {
    // Check if this matches an optimistic message (same sender, same content, within 5s)
    const optimisticMatch = prev.find(
      (m) => m.sender_id === newMsg.sender_id
        && m.content === newMsg.content
        && Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000
        && m.id !== newMsg.id  // different IDs = optimistic vs real
    );
    if (optimisticMatch) {
      // Replace optimistic with real
      return prev.map((m) => (m.id === optimisticMatch.id ? newMsg : m));
    }
    if (prev.some((m) => m.id === newMsg.id)) {
      return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
    }
    return [...prev, newMsg];
  });
})
```

**Files to modify:**

| File | Change | Type |
|------|--------|------|
| `apps/web/app/(app)/messages/components/chat-view.tsx` | Fix dedup logic in Postgres Changes INSERT handler | MODIFY |

---

### 4. AI Form Fill (AI Response -> react-hook-form setValue)

**Scope:** Already partially implemented, needs enhancement

**What exists:**
- `ride-form.tsx` lines 252-283: `handleAiPrompt()` already calls `sendAiMessage()` and uses `form.setValue()` for seats, price, notes, date/time
- Missing: origin/destination address filling from AI (the AI returns `origin_address` and `destination_address` as strings but the form needs geocoded `PlaceResult` objects)

**What to enhance:**

| File | Change | Type |
|------|--------|------|
| `apps/web/app/(app)/components/ride-form.tsx` | After AI returns addresses, geocode them to lat/lng (via Mapy.cz geocode API or Google Geocoding), then set as origin/destination PlaceResult objects | MODIFY |
| `supabase/functions/ai-assistant/index.ts` | Ensure `create_ride` intent returns structured address params | VERIFY (likely already correct) |

**Enhanced AI form fill flow:**
```
User types: "Jedu z Brna do Prahy zitra v 8 rano, 3 mista"
  -> sendAiMessage() -> Edge Function parses intent
  -> Returns: { origin_address: "Brno", destination_address: "Praha",
                departure_date: "2026-02-17", departure_time: "08:00",
                available_seats: 3 }
  -> handleAiPrompt() sets date/time/seats via form.setValue()
  -> NEW: geocode "Brno" -> { lat: 49.195, lng: 16.608, address: "Brno, Czechia" }
  -> setOrigin(geocodedResult) / setDestination(geocodedResult)
  -> This triggers the existing computeRoute useEffect
  -> Route auto-computes, map shows, price auto-fills
```

**Geocoding approach:** Use the existing Mapy.cz or Google geocoding that `AddressInput` / `AddressAutocomplete` components already use internally. Extract geocoding into a shared utility function.

---

### 5. Global Location Banner (Active Ride Location Sharing)

**Scope:** New component in app layout + hook connecting to existing Broadcast

**What exists:**
- `use-live-location.ts` subscribes to `LOCATION_CHANNEL_PREFIX + rideId` Broadcast channel
- `live-location-map.tsx` renders the driver position
- `(app)/layout.tsx` already stacks banners: OfflineBanner, EmailConfirmationBanner, ForceUpdateBanner, PendingRatingBanner
- Broadcast channels use `LOCATION_CHANNEL_PREFIX` from `@festapp/shared`

**What to create:**

| File | Change | Type |
|------|--------|------|
| `apps/web/app/(app)/components/location-sharing-banner.tsx` | Global banner: "You are sharing location for ride to [destination]" with stop button | CREATE |
| `apps/web/app/(app)/hooks/use-active-ride.ts` | Hook: query rides where user is driver + status='in_progress', return active ride if any | CREATE |
| `apps/web/app/(app)/layout.tsx` | Add LocationSharingBanner between existing banners | MODIFY |

**Integration in layout.tsx:**
```tsx
<main id="main-content" className="flex-1 pb-16 md:pb-0">
  <EmailConfirmationBanner />
  <ForceUpdateBanner />
  <PendingRatingBanner />
  <LocationSharingBanner />          {/* NEW */}
  <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
</main>
```

**Design constraint:** The banner is a client component that needs to know if the current user has an active in_progress ride. Two approaches:

- **Option A (Recommended):** Query on mount via Supabase client. Cache in React state. Re-query when ride status changes (subscribe to Postgres Changes on rides table filtered to driver_id). Lightweight, no extra context needed.
- **Option B:** Global context provider. Heavier, unnecessary for a single banner.

**The banner should NOT start GPS tracking itself.** It should only display status when the user navigates away from the ride detail page where `useLiveLocation` is active. Use a global state atom (e.g., Zustand store or simple module-level variable) to track whether location sharing is active.

**Simpler approach:** Use `localStorage` to persist active-sharing state. The ride detail page sets `localStorage.setItem("sharing_ride_id", rideId)` when sharing starts and clears it on stop. The banner reads this and shows/hides accordingly.

---

### 6. Price Formatting Utility

**Scope:** Extract utility + apply to all 16 files displaying prices

**What exists:**
- Price displayed inline as `${ride.price_czk} CZK` in ride-card.tsx (line 141)
- Price displayed inline as `${ride.price_czk} CZK` in ride-detail.tsx (line 428)
- `PRICING.CURRENCY_SYMBOL` from `@festapp/shared` used in ride-form.tsx
- `intent-confirmation.tsx` line 69: `${value} CZK` for AI confirmations
- No centralized `formatPrice()` utility exists

**What to create vs modify:**

| File | Change | Type |
|------|--------|------|
| `packages/shared/src/utils/format-price.ts` | `formatPrice(amount: number | null, locale?: string): string` returning "150 Kc" or "Zdarma" | CREATE |
| `packages/shared/src/index.ts` | Export formatPrice | MODIFY |
| `apps/web/app/(app)/components/ride-card.tsx` | Replace inline `${ride.price_czk} CZK` with `formatPrice(ride.price_czk)` | MODIFY |
| `apps/web/app/(app)/components/ride-detail.tsx` | Same replacement | MODIFY |
| `apps/web/app/(app)/components/ride-form.tsx` | Use formatPrice for display (keep raw number for slider) | MODIFY |
| `apps/web/app/(app)/components/edit-ride-form.tsx` | Same | MODIFY |
| `apps/web/app/(app)/search/page.tsx` | Same for filter display | MODIFY |
| `apps/web/app/(app)/assistant/components/intent-confirmation.tsx` | Use formatPrice in formatParamValue | MODIFY |
| `apps/web/app/(app)/routes/[id]/confirm-date.tsx` | Same | MODIFY |
| `apps/web/app/(app)/routes/[id]/route-detail.tsx` | Same | MODIFY |
| `apps/web/app/(app)/routes/route-intent-list.tsx` | Same | MODIFY |
| `apps/web/app/(app)/routes/new/route-intent-form.tsx` | Same | MODIFY |
| `apps/web/app/(app)/rides/new/recurring/page.tsx` | Same | MODIFY |
| `apps/web/app/(app)/my-rides/page.tsx` | Same | MODIFY |
| `apps/web/app/(public)/ride/[shortId]/page.tsx` | Same | MODIFY |
| `apps/web/app/(app)/events/[id]/event-detail.tsx` | Same | MODIFY |

**Utility design:**
```typescript
// packages/shared/src/utils/format-price.ts
import { PRICING } from "../constants/pricing";

export function formatPrice(
  amount: number | null | undefined,
  options?: { free?: string }
): string {
  if (amount == null || amount === 0) {
    return options?.free ?? "Zdarma";
  }
  return `${Math.round(amount)} ${PRICING.CURRENCY_SYMBOL}`;
}
```

**Note:** The `free` option allows i18n: `formatPrice(price, { free: t("rides.free") })`.

---

### 7. i18n Completion (171 Strings Across 19 Files)

**Scope:** Audit + add missing translation keys + replace hardcoded strings

**What exists:**
- `translations.ts` has 1106 lines covering cs/sk/en with flat dot-notation keys
- `useI18n()` hook returns `{ t, locale, setLocale }`
- Most ride form, auth, nav, settings strings are already translated
- Hardcoded English strings remain in: live-location-map.tsx, ride-card.tsx, chat-view.tsx, intent-confirmation.tsx, and several other components

**Strategy:** Systematic audit rather than ad-hoc discovery.

| Phase | Files | Type |
|-------|-------|------|
| 1. Audit | Grep all `.tsx` files for hardcoded English strings not wrapped in `t()` | ANALYSIS |
| 2. Key definitions | Add 171 new keys to `TranslationKeys` type and all 3 locale dictionaries in `translations.ts` | MODIFY |
| 3. Component updates | Replace hardcoded strings with `t()` calls in 19 files | MODIFY across 19 files |

**Key files with known hardcoded strings:**

| File | Hardcoded strings | Example |
|------|-------------------|---------|
| `live-location-map.tsx` | "Sharing your location with passengers", "Driver is on the way", "Waiting for driver's location..." | Lines 139, 151, 175 |
| `ride-card.tsx` | "Free", "km from your pickup" | Lines 141, 133 |
| `ride-detail.tsx` | "Free", price formatting, status labels | Line 428+ |
| `chat-view.tsx` | "Send a message to start the conversation", "Loading...", "Load older messages" | Lines 256, 249, 248 |
| `intent-confirmation.tsx` | All ACTION_LABELS, "Confirm", "Cancel", "Executing...", param labels | Lines 16-22, 166, 172 |
| `ride-form.tsx` | Some labels already use `t()`, but "Post a Ride" heading on parent page is hardcoded | rides/new/page.tsx line 58 |

**Approach for the 19 files:**
1. Add all keys to the `TranslationKeys` type first (compile-time safety)
2. Add Czech strings (primary), then Slovak (similar), then English
3. Update components file-by-file, testing as you go
4. Each file: import `useI18n`, destructure `t`, replace strings

---

## Component Dependency Graph

```
formatPrice utility (standalone, no deps)
    |
    +-- ride-card, ride-detail, ride-form, etc. (consumers)

i18n completion (standalone, no deps)
    |
    +-- All 19 files (consumers)

Chat dedup fix (standalone, no deps)
    |
    +-- chat-view.tsx only

AI form fill enhancement
    |
    +-- needs: geocoding utility extraction
    +-- modifies: ride-form.tsx

Route alternatives
    |
    +-- needs: compute-route Edge Function changes
    +-- needs: ride-map.tsx multi-polyline support
    +-- modifies: ride-form.tsx (state + UI)

Waypoints
    |
    +-- needs: compute-route Edge Function changes (same as route alternatives)
    +-- needs: new waypoint-input.tsx component
    +-- modifies: ride-form.tsx (state + submission)
    +-- modifies: ride-detail.tsx, ride-card.tsx (display)

Global location banner
    |
    +-- needs: new banner component + hook
    +-- modifies: (app)/layout.tsx
    +-- reads: existing Broadcast subscription pattern
```

## Suggested Build Order

Based on dependency analysis and risk assessment:

### Tier 1: Zero-dependency fixes (can be parallelized)
1. **Price formatting utility** -- Create in shared package, propagate to all 16 files. No risk, pure refactor.
2. **Chat dedup fix** -- Single file change in chat-view.tsx. Bug fix, immediate value.
3. **i18n string audit** -- Begin audit phase. Identify all 171 strings. Define keys.

### Tier 2: Moderate complexity (sequential within tier)
4. **i18n completion** -- Add keys to translations.ts, update 19 files. Depends on audit from step 3.
5. **AI form fill geocoding** -- Extract geocoding utility, enhance handleAiPrompt in ride-form.tsx.
6. **Global location banner** -- New component + hook + layout integration.

### Tier 3: Complex features (modify compute-route + map components)
7. **Route alternatives** -- Edge Function + RideMap + RideForm changes. Test with both Mapy.cz and Google providers.
8. **Waypoints** -- Edge Function + new component + RideForm + display components. Schema already exists.

**Rationale for this order:**
- Tier 1 items have zero risk of breaking existing functionality
- Price formatting should land before i18n (i18n will reference formatPrice in "Free"/"Zdarma" strings)
- Route alternatives and waypoints both modify compute-route and ride-form.tsx -- do them sequentially to avoid merge conflicts
- Route alternatives should come before waypoints because the alternative routes UI pattern (multiple polylines) must be designed before adding waypoint markers to the same map

## Anti-Patterns to Avoid

### Anti-Pattern 1: Modifying ride-form.tsx for multiple features simultaneously
**What:** Route alternatives + waypoints + AI fill all touch ride-form.tsx
**Why bad:** Merge conflicts, regression risk in a 930-line component
**Instead:** Build features in strict sequence. Land and test each before starting the next.

### Anti-Pattern 2: Creating separate location sharing state management
**What:** Adding Zustand/Redux just for the location sharing banner
**Why bad:** Over-engineering for a single boolean state
**Instead:** Use localStorage flag set by the ride detail page, read by the banner. Simpler, survives page refreshes.

### Anti-Pattern 3: Duplicating geocoding logic
**What:** Writing new geocoding code in ride-form.tsx for AI fill
**Why bad:** AddressInput already has geocoding internally; duplicating is maintenance burden
**Instead:** Extract geocoding into `lib/geocode.ts` utility, reuse in both AddressInput and AI form fill.

### Anti-Pattern 4: Breaking the RouteInfo interface
**What:** Changing RouteInfo from single-route to multi-route without backward compatibility
**Why bad:** RouteInfo is used in ride-form.tsx state, passed to RouteMap, used in submission
**Instead:** Keep `routeInfo` as the selected route. Add separate `alternativeRoutes` state array. All existing code continues to work with `routeInfo`.

## Scalability Considerations

Not relevant for this milestone -- these are UX improvements on an existing architecture. No new tables, no new Edge Functions (only modifications), no new API surface area. The existing architecture handles all scale concerns.

## Sources

- Direct codebase analysis: all file paths verified against actual project structure
- Google Routes API: `computeAlternativeRoutes` parameter documented at https://developers.google.com/maps/documentation/routes/compute_route_directions
- Mapy.cz routing API: https://api.mapy.cz/v1/docs/routing
- Supabase Realtime Broadcast: existing usage in `use-live-location.ts` and `chat-view.tsx`
