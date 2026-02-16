# Project Research Summary

**Project:** festapp-rideshare v1.1 UX Improvements & Bug Fixes
**Domain:** Ride-sharing platform UX enhancements
**Researched:** 2026-02-16
**Confidence:** HIGH

## Executive Summary

v1.1 is a polish milestone focused on fixing broken user experiences and enhancing AI-powered features on the existing spolujizda.online Czech ride-sharing platform. The research reveals excellent news: **zero new dependencies required**. Every planned feature can be implemented with the existing stack (Google Maps JavaScript API, Supabase Realtime, react-hook-form, Leaflet) plus built-in browser APIs like Intl.NumberFormat.

The key technical work involves three categories: (1) fixing existing bugs that users actively experience (chat message duplication, map picker zoom issues), (2) completing partially-implemented features (AI form pre-fill doesn't set addresses, location sharing lacks privacy UX), and (3) adding route alternatives and waypoint management using Google Routes API capabilities already available. The most critical finding is that **chat message deduplication is fundamentally broken** due to ID mismatch between optimistic updates and server-generated messages — users see every message they send appear twice.

Risk mitigation is straightforward since the architecture is proven (11 phases already shipped). The main pitfalls are integration risks: Google Routes API does not support alternative routes when waypoints are present, Supabase Realtime loses messages during silent disconnections, and adding 171 i18n keys in bulk will break TypeScript's type checking. All pitfalls have well-documented prevention strategies based on codebase analysis.

## Key Findings

### Recommended Stack

**No changes needed.** v1.1 requires zero new dependencies. The existing stack already provides everything needed:

**Core technologies:**
- **Google Routes API v2 + @vis.gl/react-google-maps ^1.7.1**: Already loaded; supports route alternatives via `computeAlternativeRoutes: true` and waypoints via `intermediates` array. The Maps JavaScript API `DirectionsService` enables draggable route editing natively.
- **Supabase Realtime with postgres_changes + Broadcast**: Already in use for chat and location sharing; needs deduplication fix (pass client UUID to RPC) and reconnection handling (heartbeatCallback + gap-fill fetch).
- **Intl.NumberFormat (browser built-in)**: Universal support for currency formatting with Czech locale conventions (e.g., "150 Kč" not "150,00 Kč" or "CZK 150").
- **react-hook-form ^7.71.1 + Zod validation**: Existing form infrastructure supports all new validation needs (ToS checkbox, waypoint array validation) without version changes.
- **Leaflet ^1.9.4 + Mapy.cz tiles**: Map picker improvements use existing Leaflet API for zoom control repositioning, double-click handling, and initial viewport centering.

**Configuration changes only:**
- Add `"routes"` to `GoogleMapsProvider` libraries array (currently only loads `["places"]`)
- Enable `computeAlternativeRoutes: true` in compute-route Edge Function
- Add `routes.routeLabels` to Google Routes API FieldMask

**Billing impact:** Negligible. Route alternatives cost the same per request (more data returned, not more requests). Draggable routes use client-side DirectionsService only during ride creation (minimal usage).

### Expected Features

**Must have (existing bugs — ship together):**
- **Chat duplicate message prevention**: Users actively see their own messages appear twice due to optimistic ID mismatch. Fix is straightforward: modify `send_chat_message` RPC to accept client-provided UUID.
- **Map picker zoom to existing selection**: Map always opens at Czech Republic-wide zoom even when user already selected a location via text search. Pass `initialLocation` prop and call `map.setView()`.
- **Price rounding on AI paths**: AI-set prices bypass the `roundTo10()` function. Inconsistent with slider behavior (10 CZK increments).
- **Map picker geocoding button stuck disabled**: `setIsGeocoding(false)` missing from success path. Button stays disabled after successful reverse geocode.

**Should have (UX improvements for v1.1):**
- **AI form pre-fill for addresses**: AI parses "Praha to Brno" but only fills date/time/seats/price — never sets origin/destination. Needs geocoding bridge (Mapy.cz forward geocode) to convert address strings to PlaceResult objects.
- **Location sharing privacy UX**: Add explicit opt-in toggle with disclosure ("Your live location will be shared with passengers"). Currently sharing starts without user-facing consent. Broadcast-only architecture (no persistence) is already privacy-friendly; needs UX layer.
- **Terms of Service acceptance**: No mechanism to require ToS acceptance at signup. Create `tos_acceptances` table with timestamp + version (GDPR audit trail). Add "By signing up, you agree to our Terms and Privacy Policy" text with links.
- **Cookie consent i18n**: Hardcoded English strings ("We use cookies for analytics...", "Decline", "Accept"). Replace with `t()` calls using existing i18n system.
- **Price formatting with Intl.NumberFormat**: Replace inline `${ride.price_czk} CZK` with `formatPrice()` utility across 16 files. Displays "150 Kč" (Czech convention) instead of "150 CZK" (ISO code).

**Defer (high effort, consider v1.2+):**
- **Waypoint/stop management**: High value but complex. Requires route recomputation, UI for add/remove/reorder stops, search changes for waypoint proximity matching. The `ride_waypoints` table already exists. Start with manual stop entry; defer suggested stops algorithm.
- **Route alternatives display**: Google Routes API supports up to 3 alternatives. Render as semi-transparent polylines with click-to-select. **Critical constraint:** alternatives and waypoints are mutually exclusive — when waypoints are present, disable alternatives UI entirely.

**Anti-features (do NOT build):**
- **Multiple route paths A/B/C selection**: BlaBlaCar doesn't do this. Drivers know their route; they don't need algorithm-computed alternatives. If driver wants different route, they add waypoints.
- **Real-time route tracking (full trip)**: Different from pickup location sharing. Tracking entire trip is surveillance and battery-draining. Location sharing should auto-stop when ride starts.

### Architecture Approach

All features integrate into the existing 3-step ride creation wizard (`ride-form.tsx`), real-time chat system (`chat-view.tsx`), and app layout banners. No new tables needed except `tos_acceptances` (legal compliance).

**Major components:**
1. **compute-route Edge Function**: Modify to accept `waypoints` array and `computeAlternativeRoutes` flag. Pass to Google Routes API as `intermediates` and return array of routes. Mapy.cz provider does not support alternatives (return single-element array for consistency).
2. **RideMap component**: Accept `routes: EncodedPolyline[]` + `selectedIndex` prop. Render multiple polylines with opacity differentiation (selected = solid blue, alternatives = dashed gray 50% opacity). Handle click-to-select.
3. **ChatView dedup fix**: Modify Postgres Changes INSERT handler to deduplicate by `(sender_id, content, created_at within 5 seconds)` OR pass client UUID to `send_chat_message` RPC so optimistic ID matches server ID.
4. **Price formatting utility**: Extract to `packages/shared/src/utils/format-price.ts`. Use `Intl.NumberFormat` with `maximumFractionDigits: 0` (CZK has no subunits since 2008). Apply to 16 files displaying prices.
5. **i18n completion**: Add 171 translation keys in batches of 10-20 per feature (not bulk migration). Existing `translations.ts` has ~170 keys; doubling it in one PR breaks TypeScript's error reporting.

**Integration patterns:**
- **AI form fill enhancement**: After AI returns `origin_address` / `destination_address`, geocode via Mapy.cz API, convert to PlaceResult, call `setOrigin()` / `setDestination()` to trigger existing route computation useEffect.
- **Global location sharing banner**: Add to `(app)/layout.tsx` banner stack. Use localStorage flag (`sharing_ride_id`) to persist state across navigations. Banner queries Supabase for ride details when flag is present.
- **Waypoint management**: Create `waypoint-input.tsx` component (sortable AddressInput list). Store waypoints array in ride-form state. Pass to compute-route on route calculation. Save to `ride_waypoints` table after ride insert (transaction or sequential with error handling).

### Critical Pitfalls

1. **Chat duplicate messages: Optimistic ID vs Server ID mismatch** — Current dedup checks `prev.some(m => m.id === newMsg.id)` but optimistic message uses `crypto.randomUUID()` (client) and server uses `uuid_generate_v4()` (Postgres). IDs never match. Fix: modify `send_chat_message` RPC to accept client-provided UUID. *Prevention: Pass optimisticId to RPC as `p_message_id` parameter.*

2. **Supabase Realtime silent disconnections lose messages** — When WebSocket disconnects (common on mobile tab backgrounding), messages sent during disconnect are permanently lost. Realtime has no replay. Fix: use `heartbeatCallback` to detect disconnections and re-fetch recent messages from database on reconnection. *Prevention: Add gap-fill fetch on reconnect + `worker: true` for offloaded heartbeats.*

3. **Google Routes API: Zero alternatives with waypoints** — API does not support `computeAlternativeRoutes: true` when `intermediates` array is present. Requesting both returns error or silently ignores alternatives. Additionally, some routes (short distance, only one road) have zero alternatives. Fix: disable alternatives UI when waypoints exist; check `routes.length` before accessing alternatives. *Prevention: Conditional UI + defensive array access.*

4. **i18n bulk migration breaks TypeScript** — Adding 171 new keys to `TranslationKeys` type means adding to 3 locale objects (513 total strings). TypeScript reports "Object literal may only specify known properties" at object level, not per-key. With 171 additions, finding one misspelled key is painful. Fix: add keys in batches of 10-20 per feature area. *Prevention: Incremental key addition + CI validation script for key parity across locales.*

5. **react-hook-form setValue on unmounted fields loses AI values** — AI handler calls `form.setValue("seatsTotal", ...)` while on step 0 (route), but seatsTotal field is on step 1 (not mounted). React Hook Form only tracks mounted fields unless `shouldUnregister: false`. Fix: set `shouldUnregister: false` on form config. *Prevention: Form-level configuration change.*

## Implications for Roadmap

Based on research, suggested phase structure prioritizes **fixing broken experiences before adding features** and **batching i18n completion with feature work** to avoid bulk migration.

### Phase 1: Critical Bug Fixes
**Rationale:** These bugs affect users actively using the app today. Highest impact, lowest risk.
**Delivers:** Chat works correctly, map picker works correctly, prices display consistently.
**Addresses:** Chat dedup (Pitfall 1), map picker geocoding stuck (from PITFALLS.md), map picker zoom (FEATURES.md), price rounding on AI path.
**Avoids:** Pitfall 1 (optimistic ID fix), Pitfall 6 (missing setIsGeocoding fix).
**Complexity:** LOW — single-file fixes, no schema changes.
**Research flags:** None — all solutions verified in codebase analysis.

### Phase 2: Price Formatting & i18n Foundation
**Rationale:** Price formatting utility is used by all subsequent phases. i18n interpolation must work before adding new translation keys.
**Delivers:** `formatPrice()` utility in shared package, i18n interpolation function, cookie consent i18n (first batch of keys).
**Uses:** Intl.NumberFormat (browser built-in), existing i18n provider.
**Implements:** i18n interpolation pattern for `{variables}` in translation strings (currently not implemented — Pitfall 11).
**Addresses:** Price display consistency (FEATURES.md), i18n gaps (ARCHITECTURE.md).
**Avoids:** Pitfall 11 (interpolation not working), Pitfall 8 (CZK decimal display).
**Complexity:** LOW-MEDIUM — shared utility creation + propagation to 16 files.
**Research flags:** None — Intl.NumberFormat is standard browser API.

### Phase 3: AI Form Pre-fill & Privacy UX
**Rationale:** AI pre-fill is partially working but doesn't do the most important thing (set addresses). Location sharing needs privacy layer before broader adoption.
**Delivers:** AI fills origin/destination addresses after geocoding, location sharing opt-in toggle with disclosure, global location banner in app layout.
**Addresses:** AI form enhancement (FEATURES.md), location sharing privacy (FEATURES.md).
**Avoids:** Pitfall 7 (setValue on unmounted fields via shouldUnregister: false), Pitfall 10 (stale location indicators via timestamps).
**Uses:** Mapy.cz forward geocoding API, localStorage for banner state, Supabase Broadcast (existing).
**Implements:** Geocoding utility extraction (ARCHITECTURE.md suggests extracting from AddressInput).
**Complexity:** MEDIUM — async geocoding with error handling, banner component + hook.
**Research flags:** Phase research for Mapy.cz geocoding API parameters (if documentation is sparse).

### Phase 4: Terms of Service & Realtime Resilience
**Rationale:** Legal blocker for growth (ToS acceptance) + reliability improvement (Realtime reconnection handling).
**Delivers:** `tos_acceptances` table with timestamp + version, ToS acceptance at signup, heartbeatCallback + gap-fill fetch for chat/location.
**Addresses:** ToS acceptance (FEATURES.md), Realtime silent disconnections (Pitfall 2).
**Avoids:** Pitfall 9 (missing legal timestamps — create acceptances table not boolean flag), Pitfall 2 (Realtime message loss on disconnect).
**Uses:** Supabase Realtime heartbeatCallback, Postgres for acceptance audit trail.
**Complexity:** MEDIUM — schema migration + RLS policies, client reconnection logic.
**Research flags:** None — Supabase Realtime patterns well-documented.

### Phase 5: Route Alternatives (Optional)
**Rationale:** Nice-to-have visual enhancement. Google Routes API supports this with existing stack. Consider deferring if timeline is tight.
**Delivers:** compute-route returns multiple routes, RideMap renders alternatives as semi-transparent polylines, click-to-select updates price/distance.
**Addresses:** Route alternatives display (FEATURES.md deferred section).
**Avoids:** Pitfall 5 (alternatives + waypoints conflict — disable alternatives UI when waypoints present), Pitfall 4 (breaking existing ride queries — only modify compute-route response, not database).
**Uses:** Google Routes API `computeAlternativeRoutes: true`, existing @vis.gl/react-google-maps Polyline component.
**Implements:** Multi-polyline rendering pattern (ARCHITECTURE.md).
**Complexity:** MEDIUM-HIGH — Edge Function changes + RideMap multi-polyline logic + RideForm state management.
**Research flags:** None — Google Routes API well-documented.

### Phase 6: Waypoint Management (Defer to v1.2+)
**Rationale:** High value but highest complexity. Requires UI, route recomputation, search changes. The `ride_waypoints` table already exists, so defer is low cost.
**Delivers:** Add/remove/reorder stops UI in ride form, waypoint markers on map, waypoints saved to database, route recomputed with intermediates.
**Addresses:** Waypoint/stop management (FEATURES.md deferred section).
**Avoids:** Pitfall 4 (breaking existing ride queries — use separate query function for rides with waypoints), Pitfall 5 (alternatives disabled when waypoints present).
**Uses:** Google Routes API `intermediates` array, existing `ride_waypoints` table + RLS policies.
**Implements:** Waypoint list component with drag-and-drop reorder (ARCHITECTURE.md).
**Complexity:** HIGH — new component, route recomputation, transaction-based insertion, search proximity matching changes (defer search to later).
**Research flags:** Phase research for optimal waypoint suggestion algorithm (if building suggested stops feature).

### Phase Ordering Rationale

- **Bugs first (Phase 1):** Users actively experiencing chat duplication and map picker issues. Fixing these builds trust before adding features.
- **Foundation before features (Phase 2):** Price formatting and i18n interpolation are dependencies for all subsequent phases. Adding 171 i18n keys without interpolation support means keys like `{price}` render as literal text.
- **AI + privacy grouped (Phase 3):** Both improve existing features rather than adding new ones. AI geocoding is MEDIUM complexity; location privacy is LOW-MEDIUM. Good pairing.
- **Legal + reliability together (Phase 4):** ToS acceptance is non-negotiable for growth. Realtime resilience complements it (both are "make the platform trustworthy" work).
- **Features last, alternatives before waypoints (Phase 5-6):** Route alternatives are lower risk than waypoints (no search changes needed). Alternatives should land first because waypoint UI needs to know how to handle the multi-polyline map rendering pattern.
- **Waypoint defer rationale:** Highest effort (new component, route recomputation, search changes). The `ride_waypoints` table exists but is unused — no regression risk from deferring. Can ship v1.1 without it.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (AI geocoding):** If Mapy.cz forward geocoding API docs are sparse, run phase research for API parameters, error responses, rate limits.
- **Phase 6 (Waypoint suggestions):** If building suggested stops algorithm (e.g., "popular cities along this route"), research POI data sources and matching logic. Consider skipping suggestions entirely for v1.1 — manual stop entry is sufficient.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Bug fixes):** All fixes identified in codebase analysis. No unknowns.
- **Phase 2 (Formatting + i18n):** Browser APIs (Intl.NumberFormat) and existing patterns (i18n provider enhancement).
- **Phase 4 (ToS + Realtime):** Supabase Realtime heartbeatCallback well-documented. ToS acceptance is standard CRUD + migration.
- **Phase 5 (Route alternatives):** Google Routes API extensively documented. Feature is well-understood.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Zero new dependencies. Every recommendation verified against existing package.json and codebase. Google Routes API docs are official/complete. |
| Features | **MEDIUM-HIGH** | Bug fixes confirmed via codebase reading. BlaBlaCar patterns researched via support docs (MEDIUM confidence on pricing benchmarks). AI form pre-fill requirements clear from existing code. |
| Architecture | **HIGH** | All integration points verified by reading actual file structure. Component dependencies mapped from imports. Edge Function modifications traced through existing code. |
| Pitfalls | **HIGH** | All critical pitfalls verified by codebase analysis (chat-view.tsx, map-location-picker.tsx, ride-form.tsx). Supabase Realtime pitfalls confirmed by official troubleshooting docs + GitHub issues. Google Routes API constraints from official docs. |

**Overall confidence:** **HIGH**

### Gaps to Address

**Minor gaps (address during planning):**
- **BlaBlaCar CZK pricing benchmark** (0.80 CZK/km from 2023 Jablickar.cz article): May have changed since 2023. During phase planning, check current BlaBlaCar Czech pricing if needed for competitive analysis. Not a blocker — existing formula (0.88 CZK/km) is reasonable.
- **Mapy.cz forward geocoding API rate limits**: If implementing AI address pre-fill (Phase 3), verify rate limits and error handling during phase research. The reverse geocoding API is already in use (map-location-picker.tsx) with no issues, so forward geocoding likely has similar limits.
- **i18n interpolation implementation**: Current `t()` function returns plain string with no variable substitution. Need to implement interpolation before adding keys like `rideForm.recommended: "Recommended: {price} {currency}"`. This is Pitfall 11 — fix is straightforward (regex replace in t() function).

**No major gaps.** All research findings are actionable with clear implementation paths.

## Sources

### Primary (HIGH confidence)
- **Direct codebase analysis:** All file paths, component structures, database schemas verified against actual project in `/Users/miakh/source/festapp-rideshare`
- **Google Routes API Official Docs:**
  - [Alternative Routes](https://developers.google.com/maps/documentation/routes/alternative-routes) — computeAlternativeRoutes parameter, waypoint constraint
  - [computeRoutes Reference](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes) — FieldMask, intermediates array
  - [Intermediate Waypoints](https://developers.google.com/maps/documentation/routes/intermed_waypoints) — max 23 waypoints, billing tiers
- **Google Maps JavaScript API:**
  - [Draggable Directions Example](https://developers.google.com/maps/documentation/javascript/examples/directions-draggable) — DirectionsRenderer with draggable: true
- **@vis.gl/react-google-maps:**
  - [Directions Example](https://github.com/visgl/react-google-maps/blob/main/examples/directions/src/app.tsx) — useMap() + useMapsLibrary('routes') pattern
  - [Polyline Example](https://github.com/visgl/react-google-maps/blob/main/examples/geometry/src/components/polyline.tsx) — multi-polyline rendering
- **Supabase Realtime:**
  - [Postgres Changes Docs](https://supabase.com/docs/guides/realtime/postgres-changes) — at-least-once delivery, no replay
  - [Silent Disconnections Guide](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794) — heartbeatCallback pattern
  - [Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture) — Broadcast vs Postgres Changes
  - [GitHub Issue #1088](https://github.com/supabase/realtime/issues/1088) — reconnection failures on mobile
- **MDN Web Docs:**
  - [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) — CZK currency formatting, maximumFractionDigits option
- **react-hook-form:**
  - [setValue Docs](https://react-hook-form.com/docs/useform/setvalue) — "register the input's name before invoking setValue"
  - [GitHub Issue #2578](https://github.com/react-hook-form/react-hook-form/issues/2578) — shouldUnregister behavior in wizard forms

### Secondary (MEDIUM confidence)
- **BlaBlaCar patterns:**
  - [Setting a Price FAQ](https://www.blablacar.co.uk/faq/setting-a-price) — pricing algorithm overview
  - [Recommended Pricing](https://support.blablacar.com/hc/en-gb/articles/360014530379-What-is-recommended-pricing) — price recommendation details
  - [Why Add Stopover Cities](https://support.blablacar.com/hc/en-gb/articles/360014490500-Why-add-stopover-cities-to-your-ride) — waypoint UX patterns
  - [Boost Feature](https://support.blablacar.com/hc/en-gb/articles/360020054000-Boost-Pick-up-passengers-along-the-way) — automatic intermediate city detection
  - [Jablickar.cz: BlaBlaCar Czech Market Entry](https://jablickar.cz/en/blablacar-po-prevzeti-jizdomatu-prichazi-na-cesky-trh/) — 0.80 CZK/km base rate (January 2023, may be outdated)
- **Privacy & Location:**
  - [Barracuda: Data Privacy in Ridesharing](https://blog.barracuda.com/2024/01/22/data-privacy-concerns-in-ridesharing-what-you-need-to-know) — privacy concerns overview
  - [Roam.ai: Location Permissions Best Practices](https://www.roam.ai/blog/location-permissions-best-practices) — opt-in UX patterns
- **ToS & GDPR:**
  - [TermsFeed: Click to Accept Examples](https://www.termsfeed.com/blog/examples-click-accept/) — ToS acceptance UX patterns
  - [TermsFeed: I Agree Checkboxes](https://www.termsfeed.com/blog/i-agree-checkbox/) — checkbox vs text link patterns
  - [Medium: GDPR UX Best Practices](https://medium.com/@AukaPay/best-ux-practices-for-gdpr-compliance-563b73362095) — consent design
- **Czech Currency:**
  - [Wikipedia: Czech Koruna](https://en.wikipedia.org/wiki/Czech_koruna) — denominations, halere discontinued 2008
  - [Czech National Bank: Currency in Circulation](https://www.cnb.cz/en/banknotes-and-coins/currency-circulation/structure-of-currency/) — official denomination info
- **Chat Dedup Patterns:**
  - [Idempotent Consumer Pattern (microservices.io)](https://microservices.io/patterns/communication-style/idempotent-consumer.html) — client-supplied ID pattern
  - [Ably: Idempotency in Real-Time Messaging](https://ably.com/docs/platform/architecture/idempotency) — message deduplication strategies

### Tertiary (LOW confidence — needs validation)
- **BlaBlaCar chat quality:** User complaints about duplicates and ordering issues reported on Trustpilot and Pissed Consumer. Anecdotal, not verified by using BlaBlaCar directly.

---
*Research completed: 2026-02-16*
*Ready for roadmap: yes*
