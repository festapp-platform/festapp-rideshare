# Feature Landscape: v1.1 UX Improvements & Bug Fixes

**Domain:** Ride-sharing UX polish, bug fixes, and missing interactions
**Researched:** 2026-02-16
**Confidence:** MEDIUM-HIGH (codebase analysis + BlaBlaCar patterns + Supabase Realtime docs)

---

## Table Stakes

Features that are broken or incomplete in ways users will notice immediately. Fixing these is prerequisite to growth.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **AI ride creation form pre-fill (origin/destination)** | AI parses "Praha to Brno v patek" but only fills date/time/seats/price -- never sets origin/destination addresses on the map. The most important fields are missing. | MEDIUM | Requires geocoding address strings from AI response into PlaceResult objects, then triggering route computation. See detailed analysis below. |
| **Chat duplicate message prevention** | Users see their own message appear twice: once from optimistic update, once from Postgres Changes. Current dedup checks `id` match but optimistic ID (client UUID) differs from server-assigned UUID. | LOW | The `send_chat_message` RPC generates a new UUID server-side. The optimistic message uses `crypto.randomUUID()`. These will never match. Fix is straightforward. |
| **Map picker zoom to existing selection** | Map always opens at Czech Republic center (zoom 7). If user already selected a location via text search, map should center there. Opening at country-wide zoom when user already has a pin is disorienting. | LOW | Pass optional `initialLocation` prop to MapLocationPicker. Call `map.setView([lat, lng], 14)` on init. |
| **Map picker click handling on mobile** | CircleMarker on click works but has no touch feedback. On mobile, users may tap and not see the marker appear due to small radius (8px). | LOW | Increase marker radius to 12 on mobile. Add pulsing animation on placement. Consider crosshair-center pattern instead of click-to-place. |
| **Price rounding for cash payments** | Price slider already rounds to 10 CZK increments (good). But AI-set prices and edge cases can produce non-round numbers. Czech cash has no coins smaller than 1 CZK, and in practice people pay with 10/20/50/100 CZK notes. | LOW | Already mostly handled. Enforce `roundTo10()` on all price-setting paths including AI pre-fill. |

---

## Feature Details: AI Ride Creation Form Pre-Fill

### Current Problem

The `handleAiPrompt()` function in `ride-form.tsx` (line 252-283) calls `sendAiMessage()` and receives `result.intent.params` containing:
- `origin_address` (string, e.g. "Praha")
- `destination_address` (string, e.g. "Brno")
- `departure_date`, `departure_time`, `available_seats`, `price_per_seat`, `notes`

Currently it fills date, time, seats, price, and notes -- but **ignores origin/destination entirely**. The AI response contains address strings, but the form needs `PlaceResult` objects with `{ lat, lng, address, placeId }` to set origin/destination and trigger route computation.

### Recommended Fix

1. When AI returns `origin_address` / `destination_address`, geocode them using Mapy.cz geocoding API (already used for reverse geocoding in `map-location-picker.tsx`)
2. Convert geocoded results to `PlaceResult` format
3. Call `setOrigin(place)` and `setDestination(place)` -- this will trigger the existing `useEffect` that computes the route
4. Show a brief "AI filled: Praha -> Brno" confirmation so user knows what happened

### Complexity: MEDIUM

- Geocoding is async and may return multiple results (need to pick the best one)
- Error handling: what if geocoding fails? Fall back to manual entry gracefully
- Address strings from AI may be informal ("Praha" vs "Praha, Hlavni nadrazi") -- need fuzzy matching
- Dependencies: Mapy.cz geocode API endpoint, existing `setOrigin`/`setDestination` state setters

---

## Feature Details: Chat Duplicate Message Prevention

### Current Problem (Confirmed in Code)

In `chat-view.tsx` lines 141-169:
1. User sends message -> `crypto.randomUUID()` generates `optimisticId` (e.g. "abc-123")
2. Optimistic message added to state with this ID
3. `send_chat_message` RPC is called -- server generates **its own** `uuid_generate_v4()` (e.g. "xyz-789")
4. Server inserts message, Postgres Changes fires
5. Real-time listener receives message with ID "xyz-789"
6. Dedup check on line 79: `prev.some((m) => m.id === newMsg.id)` -- checks if "xyz-789" exists in state
7. It does NOT exist (only "abc-123" exists) -> message added again
8. **Result: user sees their own message twice**

### How BlaBlaCar Handles This

BlaBlaCar's chat is notoriously buggy -- users report duplicate messages, messages appearing out of order, and chat refresh issues. This is a known weakness we can beat them on. [Source: BlaBlaCar Trustpilot reviews, Pissed Consumer complaints]

### Recommended Fix (Two Options)

**Option A: Client-supplied UUID (Recommended)**

Modify `send_chat_message` RPC to accept an optional `p_message_id UUID` parameter. Client generates the UUID, sends it with the RPC, and uses the same UUID for the optimistic update. When the Postgres Changes event arrives, the IDs will match and the dedup check on line 79 will work correctly.

```sql
-- Modified RPC signature
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_message_id UUID DEFAULT uuid_generate_v4()  -- client can supply
)
```

Complexity: LOW. One RPC parameter change + pass `optimisticId` to the RPC call.

**Option B: Sender-based dedup (Simpler but less robust)**

In the real-time listener, skip INSERT events where `sender_id === currentUserId` (since we already have the optimistic message). Only replace the optimistic message when the server version arrives.

```typescript
// In postgres_changes INSERT handler:
if (newMsg.sender_id === currentUserId) {
  // Replace most recent optimistic message from this user
  setMessages((prev) => {
    const optimisticIdx = prev.findLastIndex(
      (m) => m.sender_id === currentUserId && m.content === newMsg.content
    );
    if (optimisticIdx >= 0) {
      return prev.map((m, i) => (i === optimisticIdx ? newMsg : m));
    }
    return [...prev, newMsg];
  });
  return;
}
```

Complexity: LOW. Client-only change, no schema migration needed. But content-matching is fragile if user sends identical messages.

**Recommendation: Option A.** Client-supplied UUID is the standard idempotent pattern for real-time chat. It is a one-line schema change and handles all edge cases cleanly.

### Confidence: HIGH

This is a well-understood pattern. Supabase's own documentation on optimistic updates recommends client-generated IDs for deduplication. The Idempotent Consumer pattern is standard in distributed systems.

---

## Feature Details: Route Alternatives

### How BlaBlaCar Handles Route Alternatives

BlaBlaCar does NOT show route alternatives to drivers during ride creation. The driver enters origin and destination, and BlaBlaCar uses a single computed route. [Confidence: MEDIUM -- based on BlaBlaCar support docs and user guides]

What BlaBlaCar DOES do:
1. **Stopovers/waypoints**: Driver can add intermediate cities along the route when publishing. BlaBlaCar suggests popular stopover cities based on the route. This is their "route alternatives" equivalent -- not alternative paths, but intermediate stops.
2. **Boost**: BlaBlaCar's algorithm automatically detects intermediate cities on the route and suggests the ride to passengers searching for partial legs (e.g., Praha->Brno ride appears for passengers searching Praha->Jihlava). The driver may receive booking requests for stops they did not explicitly add.
3. **Pricing per leg**: When stopovers are added, BlaBlaCar calculates sub-prices per leg automatically.

### What This Means for spolujizda.online

"Route alternatives" should be reframed as **"waypoint/stop management"** -- not showing 3 different routes from A to B, but letting drivers add intermediate pickup/dropoff points along a single route.

### Recommended Approach

1. After route computation, show the single route on the map
2. Offer "Add a stop" button that lets driver add intermediate cities
3. Suggest popular stops along the route (use Mapy.cz POI or pre-curated list of Czech cities along major corridors)
4. Compute sub-distances for pricing per leg
5. Do NOT show Google-Maps-style "Route A / Route B / Route C" -- this adds complexity with no user value for carpooling (drivers know their own route)

### Complexity: HIGH

- Requires route re-computation with intermediate waypoints via Google Routes API (already have `compute-route` Edge Function)
- Database `ride_waypoints` table already exists and is properly indexed
- UI needs a waypoint list component with add/remove/reorder
- Price recalculation per leg needs business logic
- Dependency: Google Routes API waypoint support

---

## Feature Details: Waypoint/Stop Management in Ride Creation

### Current State

The `ride_waypoints` table exists in the database (migration 002) with proper schema:
- `ride_id`, `location` (geography point), `address`, `order_index`, `type` (pickup/dropoff)
- GIST spatial index on location
- RLS policies allow driver CRUD

But there is **no UI** to add waypoints during ride creation. The ride form (`ride-form.tsx`) only handles origin and destination.

### BlaBlaCar Pattern

1. Driver enters origin + destination
2. Route is computed
3. BlaBlaCar **suggests** stopover cities along the route (e.g., for Praha->Brno: Jihlava, Vyskov)
4. Driver can accept suggestions or add custom stops
5. Each stop becomes visible in search results for partial-leg passengers
6. Pricing is proportional: Praha->Jihlava costs less than Praha->Brno

### Recommended UX

**Step 0 (Route) enhancement:**

```
[Origin: Praha] ........... [x]
   |
   + [Add stop]  (button, below origin)
   |
[Destination: Brno] ....... [x]
```

After clicking "Add stop":
- Show same AddressInput component used for origin/destination
- New stop appears between origin and destination with drag handle for reordering
- Show suggested stops based on route (if available)
- Limit to 3 intermediate stops (keeps UX manageable, route computation fast)
- Route recomputes when stops change

**Data model:** Already handled by `ride_waypoints` table. Insert waypoints after ride creation with `order_index` values.

### Complexity: MEDIUM-HIGH

- UI: waypoint list with add/remove/reorder (drag-and-drop)
- Route recomputation with intermediate waypoints
- Price per leg calculation
- Search needs to match rides where origin/destination is near a waypoint (not just main origin/dest)
- The search/matching changes are the hardest part -- defer to separate milestone if needed

---

## Feature Details: Price Rounding & BlaBlaCar CZK Benchmarks

### Czech Cash Payment Reality

- Smallest Czech coin: 1 CZK
- Common payment denominations: 10, 20, 50, 100 CZK notes
- Halere (subunits) have not been in circulation since 2008
- **For cash payments, prices should round to 10 CZK** -- nobody carries exact change for 47 CZK

### Current Implementation (Already Good)

`ride-form.tsx` line 187: `Math.round(route.suggestedPriceCzk / 10) * 10` -- already rounds to nearest 10.
Price slider on line 649: `step={10}` -- increments by 10.
`PRICING` constants in `pricing.ts`: `MIN_PRICE_CZK: 20` -- minimum is a round number.

### BlaBlaCar CZK Pricing Benchmarks

BlaBlaCar Czech Republic uses approximately **0.80 CZK/km** as the base recommended rate per passenger. Drivers can adjust +/- 50%. [Source: Jablickar.cz article on BlaBlaCar Czech market entry, January 2023. Confidence: MEDIUM -- may have changed since then.]

**Comparison with spolujizda.online:**

Current formula: `(distance_km / 100) * 7 L/100km * 35 CZK/L * 0.36 factor`
= `distance_km * 0.0882 CZK/km` per seat

**Wait -- this seems too low.** Let me compute for a real route:

- Praha -> Brno: ~210 km
- Current formula: `210 * 0.0882 = ~18.5 CZK` per seat -- suspiciously low
- The issue: `COST_SHARING_FACTOR: 0.36` means "passenger pays 36% of fuel cost"
- Fuel cost for 210km: `(210/100) * 7 * 35 = 514.5 CZK`
- 36% of fuel: `514.5 * 0.36 = 185.2 CZK` per seat
- Actually, the formula IS correct: `(210/100) * 7 * 35 * 0.36 = 185 CZK`

So the effective rate is **~0.88 CZK/km per seat**, which aligns well with BlaBlaCar's 0.80 CZK/km. The formula is sound.

**Typical prices for common Czech routes (estimated from formula):**

| Route | Distance | Suggested Price | BlaBlaCar Approx. |
|-------|----------|----------------|-------------------|
| Praha -> Brno | 210 km | 190 CZK | 170-250 CZK |
| Praha -> Ostrava | 370 km | 330 CZK | 300-450 CZK |
| Praha -> Plzen | 90 km | 80 CZK | 70-110 CZK |
| Brno -> Olomouc | 80 km | 70 CZK | 60-100 CZK |

**Price rounding gaps to fix:**
1. AI-set prices (`params.price_per_seat`) are not rounded -- apply `roundTo10()` in `handleAiPrompt()`
2. The `calculateSuggestedPrice` function returns unrounded values -- the rounding only happens at the form level. Consider rounding in the function itself.

### Confidence: MEDIUM

BlaBlaCar's 0.80 CZK/km figure is from 2023 and may have been adjusted since. The formula comparison is based on our own code analysis and is HIGH confidence.

---

## Feature Details: Location Sharing Privacy UX

### Current Implementation

`use-live-location.ts` implements:
- Driver-only broadcasting (passengers receive)
- Adaptive GPS (high accuracy near pickup, battery-saving when far)
- Distance filter (skip broadcast if not moved enough)
- Stop event broadcast (passengers know when sharing ends)
- Auto-cleanup on unmount

### Privacy Gaps

1. **No explicit opt-in before sharing starts.** The `enabled` prop is passed in, but there is no user-facing consent dialog. Location sharing should require a deliberate action (toggle/button), not just happen automatically.
2. **No indication of what data is shared.** Users should see: "Your live location will be shared with [passenger name] until the ride starts."
3. **No way for passenger to control when they see driver location.** Currently always on if sharing is active.
4. **No data retention disclosure.** Broadcast data is ephemeral (Supabase Broadcast does not persist), which is actually great for privacy -- but users don't know this.

### Recommended Privacy UX Pattern

**Driver side:**
1. On ride detail page (when ride is confirmed), show a "Share My Location" toggle -- OFF by default
2. Before enabling, show brief dialog: "Your live location will be visible to passengers on this ride. Location is shared in real-time only -- we do not store your location history."
3. While sharing, show persistent indicator (pulsing dot in header) with "Sharing location" text and a one-tap stop button
4. Auto-stop when ride status changes to completed/cancelled

**Passenger side:**
1. On ride detail page, show "Driver is sharing location" indicator only when active
2. Show ETA based on driver position (nice-to-have, not v1.1)
3. No consent needed from passenger (they are receiving, not sharing)

### GDPR Considerations

- Location data is personal data under GDPR
- Broadcast-only (no persistence) means minimal GDPR exposure
- Still need legitimate basis: consent via opt-in toggle satisfies this
- Add location sharing mention to privacy policy

### Complexity: LOW-MEDIUM

- UI: toggle + dialog + persistent indicator
- Privacy policy text update
- No backend changes needed -- existing Broadcast architecture is already privacy-friendly

---

## Feature Details: Terms of Service Acceptance

### Current State

- Terms of Service page exists at `/terms` (`apps/web/app/(public)/terms/page.tsx`)
- Cookie consent banner exists (`components/cookie-consent.tsx`)
- **No mechanism to require ToS acceptance** -- users can use the app without agreeing
- No `tos_accepted` or `terms_accepted` field in profiles table

### Industry Patterns

**Pattern A: Signup-time acceptance (Most Common)**
"By signing up, you agree to our [Terms of Service] and [Privacy Policy]" with linked text below the signup button. No checkbox needed if the text is clear. This is the BlaBlaCar pattern.

**Pattern B: Explicit checkbox (Stricter GDPR interpretation)**
Checkbox with "I agree to the [Terms of Service]" that must be checked before signup completes. Used by apps handling payments or sensitive data.

**Pattern C: Onboarding step (Mobile-first apps)**
Dedicated screen during onboarding showing key terms with "I Agree" button. Good for mobile apps where users need to scroll through terms.

**Pattern D: Banner on existing users (ToS update)**
When terms change, show a blocking banner: "We've updated our Terms of Service. Please review and accept to continue." Records acceptance timestamp.

### Recommended Approach for spolujizda.online

1. **Signup-time text** (Pattern A): Add "By signing up, you agree to our Terms of Service and Privacy Policy" text with links below the signup form. This is sufficient for initial acceptance.

2. **Database tracking**: Add `tos_accepted_at TIMESTAMPTZ` column to `profiles`. Set on first login/signup. This enables pattern D later when terms change.

3. **Blocking banner for updates** (Pattern D, for later): When `tos_accepted_at < tos_last_updated`, show a blocking modal requiring re-acceptance. Not needed for v1.1 unless ToS is changing.

### Complexity: LOW

- Add text + links to signup page
- Add `tos_accepted_at` column to profiles
- Set on signup via trigger or onboarding flow
- Optional: middleware check for ToS acceptance

---

## Differentiators

Features that set spolujizda.online apart. Not broken, but opportunities for v1.1 polish.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Chat that actually works** | BlaBlaCar's chat is notoriously buggy (duplicates, ordering, refresh issues). Fix our dedup bug and we have objectively better chat. | LOW | Fixing the dedup bug IS the differentiator. BlaBlaCar has not fixed theirs. |
| **AI-powered ride creation** | No competitor has natural language ride creation. Fixing the address pre-fill makes this feature actually useful instead of half-working. | MEDIUM | Already have the AI pipeline. Just need the geocoding bridge. |
| **Privacy-first location sharing** | Uber/Lyft share location by default with no opt-out. We can differentiate by making sharing explicitly opt-in with clear disclosure. | LOW-MEDIUM | Broadcast-only (no persistence) is already better than most. Add the UX layer. |
| **Smart stop suggestions** | BlaBlaCar Boost does this server-side (invisible to driver). We can make it visible and interactive -- driver sees suggested stops and chooses. | HIGH | Needs POI data, route analysis, and suggestion algorithm. Consider deferring suggestion engine; start with manual stop entry. |

---

## Anti-Features

Features to explicitly NOT build for v1.1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Multiple route alternatives (A/B/C paths)** | BlaBlaCar doesn't do this. Google Maps does, but carpooling UX is different -- drivers know their route, they don't need alternatives computed. Adds significant complexity (multiple polylines, comparison UI) with near-zero user value. | Single route + waypoint management. If driver wants a different route, they adjust by adding waypoints. |
| **Price negotiation in chat** | Tempting to add "suggest a different price" in chat. Creates awkward social dynamics and undermines fair pricing. BlaBlaCar deliberately prevents this. | Driver sets price. Passenger books or doesn't. Price is visible upfront. |
| **Real-time route tracking (full trip)** | Different from pickup location sharing. Tracking the entire trip is surveillance, battery-draining, and adds zero value for intercity carpooling. | Location sharing only for pickup coordination, auto-stops when ride starts. |
| **Automatic ToS acceptance** | Some apps bury "by using this app you agree" in footer text. This is legally weak and user-hostile. | Explicit text at signup + database-tracked acceptance timestamp. |

---

## Feature Dependencies

```
[AI Form Pre-fill Fix]
    |-- requires: Mapy.cz forward geocoding
    |-- requires: existing setOrigin/setDestination setters
    |-- triggers: route computation (existing useEffect)

[Chat Dedup Fix]
    |-- requires: send_chat_message RPC modification (Option A)
    |   OR client-only change (Option B)
    |-- independent of other features

[Map Picker UX]
    |-- requires: optional initialLocation prop
    |-- independent of other features

[Waypoint Management]
    |-- requires: existing ride_waypoints table
    |-- requires: compute-route with intermediate waypoints
    |-- enhances: ride search (waypoint proximity matching)
    |-- blocks on: UI component for add/remove/reorder stops

[Price Rounding]
    |-- requires: roundTo10() applied to all price paths
    |-- independent, trivial fix

[Location Sharing Privacy]
    |-- requires: UI toggle + dialog
    |-- requires: privacy policy update
    |-- independent of other features

[ToS Acceptance]
    |-- requires: profiles table migration (tos_accepted_at)
    |-- requires: signup page text update
    |-- independent of other features
```

---

## MVP Recommendation for v1.1

### Fix First (Bug Fixes -- Ship Together)

1. **Chat duplicate messages** -- LOW effort, high impact. Users actively see the bug.
2. **Price rounding on AI path** -- trivial, apply `roundTo10()` consistently.
3. **Map picker zoom to selection** -- LOW effort, immediate UX improvement.

### Then Build (UX Improvements)

4. **AI form pre-fill for addresses** -- MEDIUM effort, makes AI feature actually useful. Currently the AI "works" but doesn't do the most important thing.
5. **Location sharing opt-in dialog** -- LOW-MEDIUM effort, important for trust/GDPR.
6. **ToS acceptance at signup** -- LOW effort, legal requirement.

### Defer (Next Milestone)

7. **Waypoint/stop management** -- HIGH effort, needs search changes too. Ship with basic manual stop entry first, defer suggested stops.
8. **Route alternatives** -- Reframed as part of waypoint management. Not a separate feature.

---

## Sources

### BlaBlaCar Patterns
- [BlaBlaCar FAQ: Setting a Price](https://www.blablacar.co.uk/faq/setting-a-price) -- pricing algorithm overview
- [BlaBlaCar: What is recommended pricing](https://support.blablacar.com/hc/en-gb/articles/360014530379-What-is-recommended-pricing) -- price recommendation details
- [BlaBlaCar: Why add stopover cities](https://support.blablacar.com/hc/en-gb/articles/360014490500-Why-add-stopover-cities-to-your-ride) -- waypoint/stopover UX
- [BlaBlaCar: Boost feature](https://support.blablacar.com/hc/en-gb/articles/360020054000-Boost-Pick-up-passengers-along-the-way) -- automatic intermediate city detection
- [BlaBlaCar: Boost booking requests for stops you didn't add](https://support.blablacar.com/hc/en-gb/articles/360014470720-If-you-receive-a-Boost-booking-request-for-a-stopover-you-didn-t-add) -- how Boost suggests stops drivers didn't list
- [BlaBlaCar Czech market entry (Jablickar.cz)](https://jablickar.cz/en/blablacar-po-prevzeti-jizdomatu-prichazi-na-cesky-trh/) -- 0.80 CZK/km base rate (2023, MEDIUM confidence)

### Chat Dedup Patterns
- [Supabase Realtime docs](https://supabase.com/docs/guides/realtime) -- at-least-once delivery model
- [Idempotent Consumer Pattern (microservices.io)](https://microservices.io/patterns/communication-style/idempotent-consumer.html) -- standard dedup approach
- [Scalable Real-Time Systems with Supabase (Medium)](https://medium.com/@ansh91627/building-scalable-real-time-systems-a-deep-dive-into-supabase-realtime-architecture-and-eccb01852f2b) -- optimistic UI patterns
- [Ably: Idempotency in real-time messaging](https://ably.com/docs/platform/architecture/idempotency) -- client-supplied message IDs

### Privacy & Location
- [Barracuda: Data privacy in ridesharing](https://blog.barracuda.com/2024/01/22/data-privacy-concerns-in-ridesharing-what-you-need-to-know) -- privacy concerns overview
- [Roam.ai: Location permissions best practices](https://www.roam.ai/blog/location-permissions-best-practices) -- opt-in UX patterns
- [Ride sharing privacy (Wikipedia)](https://en.wikipedia.org/wiki/Ride_sharing_privacy) -- GDPR and location data

### ToS Patterns
- [TermsFeed: Click to Accept examples](https://www.termsfeed.com/blog/examples-click-accept/) -- ToS acceptance UX patterns
- [TermsFeed: I Agree checkboxes](https://www.termsfeed.com/blog/i-agree-checkbox/) -- checkbox best practices
- [Medium: GDPR UX best practices](https://medium.com/@AukaPay/best-ux-practices-for-gdpr-compliance-563b73362095) -- GDPR consent design

### Czech Currency
- [Czech koruna (Wikipedia)](https://en.wikipedia.org/wiki/Czech_koruna) -- denominations, halere discontinued 2008
- [Czech National Bank: Currency in circulation](https://www.cnb.cz/en/banknotes-and-coins/currency-circulation/structure-of-currency/) -- official denomination info

---

*Feature research for: spolujizda.online v1.1 UX Improvements & Bug Fixes*
*Researched: 2026-02-16*
