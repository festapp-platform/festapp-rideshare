# Domain Pitfalls: v1.1 UX Improvements & Bug Fixes

**Domain:** Adding features to existing Czech ride-sharing platform (11 phases shipped)
**Researched:** 2026-02-16
**Scope:** Integration pitfalls specific to adding these features to the existing codebase
**Confidence:** MEDIUM-HIGH

---

## Critical Pitfalls

Mistakes that cause visible bugs, data loss, or require significant rework.

### Pitfall 1: Chat Duplicate Messages -- Optimistic ID vs Server ID Mismatch

**What goes wrong:**
The current `chat-view.tsx` (line 143) generates a `crypto.randomUUID()` for the optimistic message, but the server RPC `send_chat_message` generates its own UUID via `uuid_generate_v4()` in Postgres (line 176 of the migration). The optimistic message has ID `abc-123`, the server-inserted message has ID `def-456`. When the Postgres Changes INSERT event arrives, the dedup check on line 79 (`prev.some((m) => m.id === newMsg.id)`) fails because the IDs are different. Result: the user sees their message twice -- once from the optimistic insert, once from the Realtime event.

**Why it happens:**
The current code deduplicates by message ID, but the client-generated UUID and the server-generated UUID are never the same. The dedup on line 79 only catches duplicate Realtime events (same server event arriving twice), not the optimistic-vs-server duplicate.

**Existing code that is broken:**
```typescript
// chat-view.tsx line 77-83
setMessages((prev) => {
  // This check ONLY catches duplicate Realtime events, NOT optimistic duplicates
  if (prev.some((m) => m.id === newMsg.id)) {
    return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
  }
  return [...prev, newMsg];
});
```

**Consequences:**
- Every sent message appears twice in the chat
- Users see their own message duplicated immediately after sending
- Scrolling becomes erratic as message count jumps

**Prevention:**
Option A (recommended): Pass the client UUID to the server RPC so the server uses it as the message ID. Change `send_chat_message` to accept an optional `p_message_id UUID` parameter:
```sql
INSERT INTO public.chat_messages (id, conversation_id, sender_id, content, message_type)
VALUES (COALESCE(p_message_id, uuid_generate_v4()), ...);
```
Then the client optimistic ID matches the server ID, and the existing dedup logic works.

Option B: Use a secondary dedup key. Add a `client_ref` column to `chat_messages`, or dedup by `(sender_id, content, created_at within 2 seconds)`. Less clean, more fragile.

Option C: Filter out own messages from Realtime. In the Postgres Changes handler, ignore messages where `sender_id === currentUserId` since we already have the optimistic version. Replace with server version only on a slight delay to update `read_at` and `created_at`.

**Detection:** Send any message in the chat and check if it appears twice.

**Confidence:** HIGH -- verified by reading the actual codebase. The `send_chat_message` RPC does not accept a client-provided ID, and the optimistic update uses `crypto.randomUUID()`.

---

### Pitfall 2: Realtime Channel Reconnection Loses Messages

**What goes wrong:**
When a Supabase Realtime WebSocket disconnects silently (common on mobile browsers, tab backgrounding, network switches), messages sent during the disconnect window are permanently lost for that client. Supabase Realtime has no message queue -- there is no replay of missed events. The user returns to the chat tab and sees no new messages, even though the other person sent several.

**Why it happens:**
Browser tabs throttle JavaScript timers when backgrounded, preventing heartbeat signals from reaching the server. The server assumes the client disconnected and closes the WebSocket. When the client reconnects, it only receives new events from that point forward. Supabase explicitly states: "the server does not guarantee that every message will be delivered to your clients."

**Consequences:**
- Silent message loss in chat
- Location sharing state becomes stale without any error indication
- Users think chat is broken when they return to a backgrounded tab

**Prevention:**
1. Use `heartbeatCallback` on the Realtime client to detect disconnections:
```typescript
const supabase = createClient(url, key, {
  realtime: {
    heartbeatCallback: (status) => {
      if (status === 'disconnected') {
        // Re-fetch recent messages from DB
        refetchRecentMessages();
      }
    },
    worker: true, // Offload heartbeat to Web Worker
  },
});
```
2. On reconnection, re-fetch the last N messages from the database to fill gaps.
3. For location sharing: store a `last_seen_at` timestamp and show "last updated X minutes ago" instead of pretending the location is live.

**Detection:** Background the chat tab for 60+ seconds, send a message from the other user, then return to the tab. If the message is missing, this pitfall is present.

**Confidence:** HIGH -- verified via [Supabase Realtime Troubleshooting Docs](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794) and [GitHub issue #1088](https://github.com/supabase/realtime/issues/1088).

---

### Pitfall 3: i18n Bulk Migration -- Type System Becomes Useless if Keys Diverge

**What goes wrong:**
The current i18n system uses a TypeScript `TranslationKeys` type with 171+ literal key definitions (counted from `translations.ts`). Adding 171 new keys means adding them to: (1) the `TranslationKeys` type, (2) the `cs` object, (3) the `sk` object, and (4) the `en` object. If any key is missing from any locale, TypeScript catches it. But if you add a key to the type but misspell it in one locale object, TypeScript will report an error on the ENTIRE object, not the specific key. With 171+ new keys, finding the one misspelled key in a 340-key object is painful.

**Why it happens:**
TypeScript's structural typing reports "Object literal may only specify known properties" at the object level, not per-key. Adding 171 keys in one PR means 171 potential points of divergence across 3 locales (513 total strings to get right).

**Consequences:**
- If you add a key to `TranslationKeys` but miss it in `sk`, the entire `sk` object has a type error with no clear pointer to which key is missing
- If you add a key to `cs` but typo it (e.g., `"rides.postRides"` instead of `"rides.postRide"`), TypeScript shows an error on the whole object, not the typo
- If you miss an interpolation variable (e.g., `{price}` in cs but not in sk), there is zero type safety -- the `t()` function returns `string` with no interpolation checking

**Prevention:**
1. Add keys in small batches (10-20 per PR), not all 171 at once. Each batch should be a self-contained feature area (e.g., "route alternatives keys", "waypoint keys", "ToS keys").
2. Write a build-time validation script that checks:
   - All keys in `TranslationKeys` exist in all 3 locale objects
   - All keys in locale objects exist in `TranslationKeys` (no orphans)
   - Interpolation variables (`{variable}`) match across all locales
3. Consider splitting `translations.ts` into per-feature files that are merged:
```typescript
// translations/rides.ts -- just ride-related keys
// translations/chat.ts -- just chat-related keys
// translations/index.ts -- merges all
```
4. Add a CI check: `Object.keys(cs).length === Object.keys(sk).length === Object.keys(en).length`

**Detection:** Run `tsc --noEmit` after adding keys. If it passes, also run a custom script to verify interpolation variable parity.

**Confidence:** HIGH -- verified by examining the existing `translations.ts` structure. The file is already 1107 lines with ~170 keys per locale. Adding 171 more doubles it.

---

### Pitfall 4: Waypoints Schema Migration Breaks Existing Ride Queries

**What goes wrong:**
The `ride_waypoints` table already exists (migration `00000000000002_rides.sql` lines 127-139). But the ride form, ride detail, and search results currently do not query or display waypoints. Adding waypoint support to the UI means changing how rides are fetched. If you add `.select('*, ride_waypoints(*)')` to existing ride queries, it changes the response shape for ALL rides, including the thousands of existing rides that have zero waypoints. Components that destructure the ride response will break if they do not handle the new nested `ride_waypoints` array.

**Why it happens:**
Developers add the join to the query and update the new ride detail page to render waypoints, but forget to update the ride card component, the search results, the "my rides" page, the ride share page, and the booking confirmation page -- all of which also fetch rides.

**Consequences:**
- Existing ride displays break or show undefined values
- TypeScript types diverge from actual API response shape
- Mobile app (if using same queries) breaks on different release cycle

**Prevention:**
1. Do NOT add `.select('*, ride_waypoints(*)')` to all ride queries. Only add the join on the ride detail page where waypoints are displayed.
2. Create a separate query function for "ride with waypoints" vs "ride summary":
```typescript
// Existing (unchanged)
export const getRideSummary = (supabase, id) =>
  supabase.from('rides').select('id, origin_address, destination_address, ...');

// New (for detail page only)
export const getRideWithWaypoints = (supabase, id) =>
  supabase.from('rides').select('*, ride_waypoints(*)').eq('id', id);
```
3. Update the shared TypeScript types to have `Ride` (without waypoints) and `RideDetail` (with waypoints).
4. Add waypoints to the ride creation flow ONLY -- do not change how existing rides are read until the UI is ready.

**Detection:** After adding waypoint support, visit the search page, my-rides page, and ride share page. All should still work identically to before.

**Confidence:** HIGH -- verified that `ride_waypoints` table exists but is not referenced in any current UI component.

---

### Pitfall 5: Google Routes API Alternatives -- Zero Alternatives with Waypoints

**What goes wrong:**
The Google Routes API `computeAlternativeRoutes: true` parameter cannot be used together with intermediate waypoints. If you add waypoint/stops support to the route computation AND request alternatives in the same API call, the API will either return an error or silently ignore the alternatives parameter. Additionally, even without waypoints, the API may return zero alternatives for some routes (e.g., when there is only one viable road between two points).

**Why it happens:**
The current `compute-route` Edge Function (line 108-123) sends a simple origin-destination request. Adding `computeAlternativeRoutes: true` works for simple A-to-B routes. But when waypoints are added to the same request, the alternatives feature is explicitly unsupported by the API. Developers often discover this after implementing both features independently.

**Consequences:**
- If waypoints and alternatives are requested together: API error or silent fallback to single route
- If no alternatives exist for a route: UI shows "select a route" with only one option, confusing users
- If the alternative routes response is not properly handled: the code crashes trying to access `routes[1]` on a single-element array

**Prevention:**
1. When the ride has waypoints, disable the "show alternative routes" UI entirely. Show a message: "Alternative routes are not available for rides with stops."
2. Always check `data.routes.length` before accessing alternatives:
```typescript
const routes = data.routes ?? [];
if (routes.length === 0) {
  // No route found at all
  throw new Error("No route found");
}
// routes[0] is always the default route
// routes[1..N] are alternatives, may not exist
const alternatives = routes.slice(1);
```
3. The FieldMask must include `routes.routeLabels` to distinguish default from alternatives.
4. Budget for doubled API costs: requesting alternatives doubles the computational cost and response time per the Google docs.

**Detection:** Test with a route that has waypoints. Test with a very short route (e.g., within the same city district) where alternatives are unlikely.

**Confidence:** HIGH -- verified via [Google Routes API Alternative Routes docs](https://developers.google.com/maps/documentation/routes/alternative-routes): "Alternative routes cannot be requested when your route includes intermediate stops."

---

## Moderate Pitfalls

### Pitfall 6: Map Picker Reverse Geocode Race Condition

**What goes wrong:**
The current `MapLocationPicker` (line 31-51) has a bug: `setIsGeocoding(false)` is only called in the `catch` fallback path, not in the success path. After a successful reverse geocode, `isGeocoding` stays `true` forever, keeping the "Confirm location" button disabled (`disabled={!selectedPoint || isGeocoding}` on line 118).

Additionally, rapid clicking on the map fires multiple `reverseGeocode` calls. The responses may arrive out of order, showing the address from an earlier click rather than the latest one.

**Prevention:**
1. Fix the missing `setIsGeocoding(false)` in the success path (add it after `setAddress(...)` on line 42).
2. Use an AbortController or a request counter to discard stale geocode responses:
```typescript
const requestIdRef = useRef(0);

const reverseGeocode = useCallback(async (lat: number, lng: number) => {
  const thisRequest = ++requestIdRef.current;
  setIsGeocoding(true);
  try {
    const res = await fetch(...);
    if (thisRequest !== requestIdRef.current) return; // Stale, discard
    // process response...
  } finally {
    if (thisRequest === requestIdRef.current) {
      setIsGeocoding(false);
    }
  }
}, []);
```

**Confidence:** HIGH -- verified by reading `map-location-picker.tsx`. The `setIsGeocoding(false)` is definitively missing from the success path.

---

### Pitfall 7: AI Form Pre-fill Calls setValue on Unmounted/Non-Visible Fields

**What goes wrong:**
The current `ride-form.tsx` AI handler (line 252-283) calls `form.setValue("seatsTotal", ...)`, `form.setValue("priceCzk", ...)`, and `form.setValue("notes", ...)` after AI parsing. But the form is a 3-step wizard. If the user is on step 0 (route), the fields for `seatsTotal` (step 1) and `priceCzk`/`notes` (step 2) are not rendered. React Hook Form registers fields when their inputs mount. `setValue` on unregistered fields silently does nothing -- the values are lost.

**Why it happens:**
React Hook Form only tracks fields that are currently mounted (unless using `shouldUnregister: false`). In a wizard form, fields from future steps are not mounted yet. The AI response arrives and tries to set them, but they have not been registered. The react-hook-form docs explicitly warn: "register the input's name before invoking setValue."

**Consequences:**
- AI successfully parses "4 seats, 150 CZK" but when user advances to step 1, seats shows the default (4 by coincidence), and step 2 shows the route-computed price, not the AI-parsed price
- Users think AI did nothing, reducing trust in the feature
- Intermittently works when AI is slow (user already advanced to later steps)

**Prevention:**
1. Set `shouldUnregister: false` on the form to keep field registrations across wizard steps:
```typescript
const form = useForm<CreateRide>({
  resolver: zodResolver(CreateRideSchema),
  defaultValues: { seatsTotal: 4, bookingMode: "request", notes: "" },
  shouldUnregister: false, // Keeps values even when fields unmount
});
```
2. Alternatively, store AI-parsed values in component state and apply them via `useEffect` when each step mounts.
3. Use `form.reset({ ...form.getValues(), ...aiValues })` instead of multiple `setValue` calls, as `reset()` works on all fields regardless of mount state.

**Confidence:** HIGH -- verified via [react-hook-form setValue docs](https://react-hook-form.com/docs/useform/setvalue) and the wizard step pattern in `ride-form.tsx`.

---

### Pitfall 8: CZK Price Rounding -- Display vs Storage Mismatch

**What goes wrong:**
The rides table stores `price_czk` as `NUMERIC(10,2)` (line 28 of rides migration), meaning it supports decimal values like `147.50`. But the UI rounds to nearest 10 CZK for the slider (`roundTo10` on line 223 of ride-form.tsx, and `Math.round(route.suggestedPriceCzk / 10) * 10` on line 187). If `Intl.NumberFormat` is later used to display prices with `style: 'currency', currency: 'CZK'`, the Czech locale format adds decimal places by default (`147,00 Kc`), creating visual inconsistency with the slider that shows clean `150 Kc`.

Additionally, CZK is a zero-subunit currency in practice (Czech Republic eliminated hellers in 2008). Displaying `150,00 Kc` looks wrong to Czech users -- they expect `150 Kc`.

**Prevention:**
1. When formatting CZK for display, always use `maximumFractionDigits: 0`:
```typescript
new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
}).format(150); // "150 Kc" not "150,00 Kc"
```
2. Store prices as integers in the database (change `NUMERIC(10,2)` to `INTEGER`). Since CZK has no subunits in practice, decimal storage wastes precision and creates rounding confusion.
3. Ensure the price slider step stays at 10 (matching Czech cash conventions where 10 CZK is the smallest commonly-used coin for ride pricing).

**Detection:** Display any price using `Intl.NumberFormat` with default CZK settings. If it shows `.00`, this pitfall is present.

**Confidence:** MEDIUM -- based on Czech currency conventions and MDN `Intl.NumberFormat` documentation. The specific `NUMERIC(10,2)` vs `INTEGER` schema choice is a design decision, not a bug.

---

### Pitfall 9: Terms of Service -- Missing Legal Timestamp Persistence

**What goes wrong:**
If ToS acceptance is implemented as a boolean flag (`tos_accepted: true`) without a timestamp and version identifier, the app cannot prove WHEN the user accepted or WHICH version they accepted. When the ToS is updated, there is no way to know which users need to re-accept. GDPR requires proof of consent with timestamps.

**Why it happens:**
Developers implement the simplest possible solution: a boolean column on the profiles table. This blocks signup (the immediate requirement) but fails the legal requirement.

**Consequences:**
- Cannot comply with GDPR audit requests ("show me when user X consented")
- Cannot force re-acceptance when ToS changes
- Legal exposure if disputes arise about what terms a user agreed to

**Prevention:**
1. Create a `tos_acceptances` table, not a boolean flag:
```sql
CREATE TABLE public.tos_acceptances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  tos_version TEXT NOT NULL, -- e.g., "2026-02-16-v1"
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET, -- optional but recommended
  user_agent TEXT  -- optional but recommended
);
```
2. On signup, insert a row with the current ToS version.
3. On app load, check if the user's latest acceptance matches the current ToS version. If not, show a re-acceptance screen.
4. Never delete acceptance records -- they are legal audit logs.

**Confidence:** HIGH -- GDPR consent requirements are well-documented. This is a legal compliance issue, not a technical one.

---

### Pitfall 10: Location Sharing Global State -- Stale After Broadcast Channel Disconnect

**What goes wrong:**
If location sharing uses Supabase Broadcast and the WebSocket disconnects (see Pitfall 2), other users' location markers freeze on the map at their last known position. There is no indication that the location is stale. Users may drive to a "live" location that is actually 10 minutes old.

**Why it happens:**
Broadcast is fire-and-forget -- there is no persistence layer. When the channel disconnects, the last received position stays in React state. Without a staleness check, the UI treats a 10-minute-old position the same as a 5-second-old one.

**Prevention:**
1. Include a timestamp in every location broadcast payload:
```typescript
channel.send({
  type: 'broadcast',
  event: 'location',
  payload: { lat, lng, timestamp: Date.now(), userId },
});
```
2. On the receiving side, track `lastUpdatedAt` per user and show staleness:
```typescript
const isStale = Date.now() - lastUpdatedAt > 30_000; // 30 seconds
// Show grayed-out marker or "Last seen 2 min ago" badge
```
3. When the channel reconnects (detected via `heartbeatCallback`), request a fresh position from all participants via a "ping" broadcast event.
4. Auto-remove location markers after 60 seconds of no updates.

**Confidence:** MEDIUM-HIGH -- based on Supabase Broadcast behavior (no persistence, no delivery guarantee) and common real-time mapping patterns.

---

## Minor Pitfalls

### Pitfall 11: i18n Interpolation Variables Not Type-Checked

**What goes wrong:**
The current `t()` function (in `provider.tsx` line 39-44) returns a plain `string`. Interpolation like `{price}` in `"rideForm.recommended"` is handled by... nothing. The raw `{price}` text appears in the UI.

**Prevention:**
Add a simple interpolation function to the `t()` helper:
```typescript
const t = useCallback(
  (key: string, vars?: Record<string, string | number>): string => {
    let value = (translations[locale] as Record<string, string>)[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return value;
  },
  [locale],
);
```
Then verify all existing usages of keys with `{variables}` pass the variables parameter.

**Confidence:** HIGH -- verified that `auth.otpSent` uses `{length}` and `rideForm.recommended` uses `{price}` and `{currency}`, but the `t()` function does no interpolation.

---

### Pitfall 12: Supabase Client Re-created on Every Render

**What goes wrong:**
In `chat-view.tsx` line 43, `const supabase = createClient()` is called inside the component body (not in a ref, useMemo, or module scope). If `createClient()` returns a new instance on every call, the channel subscription in the useEffect will create new channels on every re-render because `supabase` is in the dependency array (line 138).

**Prevention:**
Verify that `createClient()` is memoized (returns a singleton). If not, wrap it:
```typescript
const supabase = useMemo(() => createClient(), []);
```
Or better, ensure the `@/lib/supabase/client` module exports a singleton.

**Confidence:** MEDIUM -- depends on whether `createClient()` is already memoized. Most Supabase Next.js templates use a singleton pattern, but the eslint-disable comment on line 138 suggests the developers already noticed this dependency issue.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Chat dedup fix | Pitfall 1: Optimistic ID mismatch | CRITICAL | Pass client UUID to server RPC |
| Chat reconnection | Pitfall 2: Silent message loss | CRITICAL | Add heartbeat callback + gap-fill fetch |
| Map picker bug | Pitfall 6: isGeocoding stuck true | MODERATE | Fix missing setIsGeocoding(false) |
| AI form pre-fill | Pitfall 7: setValue on unmounted fields | MODERATE | Set shouldUnregister: false |
| Route alternatives | Pitfall 5: Zero alternatives + waypoint conflict | CRITICAL | Check array length, disable with waypoints |
| Waypoints/stops | Pitfall 4: Breaking existing ride queries | CRITICAL | Separate query functions for summary vs detail |
| Price rounding | Pitfall 8: CZK decimal display | MINOR | Use maximumFractionDigits: 0 |
| i18n bulk migration | Pitfall 3: Type system breaks with bulk adds | MODERATE | Add keys in batches of 10-20 per feature |
| i18n interpolation | Pitfall 11: Variables not substituted | MODERATE | Add interpolation to t() function |
| Location sharing state | Pitfall 10: Stale positions after disconnect | MODERATE | Timestamp + staleness indicator |
| Terms of Service | Pitfall 9: Missing legal timestamps | CRITICAL (legal) | tos_acceptances table with version + timestamp |

## Implementation Order Recommendation

Based on pitfall severity and dependencies:

1. **First:** Fix Pitfall 1 (chat dedup) and Pitfall 6 (map picker isGeocoding) -- these are existing bugs that affect current users now
2. **Second:** Fix Pitfall 11 (i18n interpolation) -- foundation for all new translation keys
3. **Third:** Implement Pitfall 9 (ToS with timestamps) -- legal blocker for any new user flow
4. **Fourth:** Add new features (alternatives, waypoints, AI pre-fill) with their respective pitfall mitigations baked in
5. **Throughout:** Add i18n keys in batches (Pitfall 3) alongside each feature, not as one bulk migration

## Sources

- [Supabase Realtime Postgres Changes Docs](https://supabase.com/docs/guides/realtime/postgres-changes) -- event delivery behavior (HIGH confidence)
- [Supabase Realtime Silent Disconnections Guide](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794) -- heartbeatCallback pattern (HIGH confidence)
- [Supabase Realtime GitHub Issue #1088](https://github.com/supabase/realtime/issues/1088) -- reconnection failures (HIGH confidence)
- [Google Routes API Alternative Routes](https://developers.google.com/maps/documentation/routes/alternative-routes) -- waypoint constraint, max 3 alternatives (HIGH confidence)
- [Google Routes API computeRoutes Reference](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes) -- field masks and response structure (HIGH confidence)
- [react-hook-form setValue Docs](https://react-hook-form.com/docs/useform/setvalue) -- register before setValue requirement (HIGH confidence)
- [react-hook-form Issue #2578](https://github.com/react-hook-form/react-hook-form/issues/2578) -- setValue in useEffect race condition (HIGH confidence)
- [MDN Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) -- CZK currency formatting options (HIGH confidence)
- Codebase verification: `chat-view.tsx`, `map-location-picker.tsx`, `ride-form.tsx`, `translations.ts`, `00000000000002_rides.sql`, `00000000000004_chat.sql`, `compute-route/index.ts` (HIGH confidence)

---
*Pitfalls research for: Festapp Rideshare v1.1 UX Improvements & Bug Fixes*
*Researched: 2026-02-16*
