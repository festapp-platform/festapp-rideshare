# Phase 12: Critical Bug Fixes & Admin Setup - Research

**Researched:** 2026-02-16
**Domain:** Bug fixes (AI form pre-fill, chat dedup, map picker, time picker) + Supabase admin role setup
**Confidence:** HIGH

## Summary

Phase 12 addresses four broken user-facing features and two admin configuration tasks. All six requirements have been thoroughly analyzed against the existing codebase. The bugs are well-understood with clear root causes confirmed via code inspection, and the admin setup leverages infrastructure that already exists (middleware check, `is_admin()` SQL function, admin panel routes).

The most complex fix is BUG-01 (AI ride creation), which requires building a forward geocoding bridge to convert AI-returned address strings into `PlaceResult` objects with lat/lng coordinates, plus a react-hook-form configuration change (`shouldUnregister: false`) to prevent wizard step changes from losing AI-set values. The other three bugs are single-file, surgical fixes. The admin tasks require only a Supabase CLI command and a seed migration.

**Primary recommendation:** Fix bugs in order of complexity (BUG-03 map picker, BUG-04 time picker, BUG-02 chat dedup, BUG-01 AI form pre-fill), then handle admin setup last since it has no code dependencies.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUG-01 | AI ride creation parses natural language input and pre-fills form fields (origin, destination, date, time) -- fix geocoding bridge and wizard shouldUnregister | Detailed analysis of `ride-form.tsx` lines 252-283 shows `handleAiPrompt()` ignores `origin_address`/`destination_address` from AI response. Requires Mapy.cz forward geocode API (`/v1/geocode`) to convert address strings to lat/lng, then `setOrigin()`/`setDestination()` to trigger route computation. Also requires `shouldUnregister: false` on useForm config. |
| BUG-02 | Chat messages appear exactly once -- fix UUID mismatch between optimistic insert and Realtime delivery | Confirmed in `chat-view.tsx`: optimistic message uses `crypto.randomUUID()` (line 143) but `send_chat_message` RPC generates its own `uuid_generate_v4()` (migration line 176). IDs never match, so dedup check on line 79 fails. Fix: modify RPC to accept client-supplied UUID. |
| BUG-03 | Map location picker responds to clicks without getting stuck -- fix missing setIsGeocoding(false) in success path | Confirmed in `map-location-picker.tsx` lines 31-51: `setIsGeocoding(true)` is called at start, but `setIsGeocoding(false)` only appears in the catch fallback (line 50), not after successful geocode (line 42). The confirm button is disabled while `isGeocoding` is true (line 118). |
| BUG-04 | Time picker only allows selecting future dates and times | `date-time-picker.tsx` already disables past dates in the calendar (line 188: `isPast` check). But the hour/minute selects (lines 228-249) show all 24 hours and all minutes regardless of whether today is selected. When user picks today's date, past times should be filtered. |
| ADMIN-05 | Admin role is set via app_metadata.is_admin on specific user accounts (not self-assignable) | Infrastructure already exists: `is_admin()` SQL function (migration 07, line 49), middleware admin route check (middleware.ts line 118-125), admin panel pages at `/admin/*`. Missing: a mechanism to actually set `app_metadata.is_admin = true` on a user. Requires Supabase Admin API (`auth.admin.updateUserById`). |
| ADMIN-06 | bujnmi@gmail.com is configured as admin | Requires running a one-time script or seed migration to set admin flag on this specific user via Supabase Admin API. |
</phase_requirements>

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | existing | Form state management in ride-form.tsx | Already used; `shouldUnregister` is a built-in option |
| @supabase/supabase-js | v2 | Supabase client for RPC calls, auth admin API | Already used throughout |
| date-fns | existing | Date manipulation in time picker | Already used for calendar grid |
| leaflet | existing | Map in location picker | Already used for MapLocationPicker |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Mapy.cz REST API v1 | v1 | Forward geocoding (address to coordinates) | BUG-01: convert AI address strings to PlaceResult |

### Alternatives Considered

None -- all fixes use existing libraries and APIs already in the project.

**Installation:** No new packages needed.

## Architecture Patterns

### Files to Modify

```
apps/web/app/(app)/components/
├── ride-form.tsx              # BUG-01: Add geocoding bridge in handleAiPrompt(), add shouldUnregister:false
├── map-location-picker.tsx    # BUG-03: Add setIsGeocoding(false) in success path
├── date-time-picker.tsx       # BUG-04: Filter past hours/minutes when today is selected
supabase/
├── migrations/                # BUG-02: New migration to alter send_chat_message RPC
│   └── YYYYMMDDHHMMSS_chat_client_uuid.sql
├── seed.sql                   # ADMIN-06: Add admin flag for bujnmi@gmail.com (or separate script)
apps/web/app/(app)/messages/components/
├── chat-view.tsx              # BUG-02: Pass client UUID to RPC call
```

### Pattern 1: Forward Geocoding Bridge (BUG-01)

**What:** Convert AI-returned address strings (e.g., "Ostrava", "Brno") into `PlaceResult` objects with lat/lng/address for the ride form.

**When to use:** After `handleAiPrompt()` receives `origin_address` and/or `destination_address` from the AI response.

**Implementation approach:**
```typescript
// In ride-form.tsx, add a geocoding helper
async function forwardGeocode(address: string): Promise<PlaceResult | null> {
  const MAPY_API_KEY = process.env.NEXT_PUBLIC_MAPY_CZ_API_KEY ?? "";
  const url = new URL("https://api.mapy.cz/v1/geocode");
  url.searchParams.set("apikey", MAPY_API_KEY);
  url.searchParams.set("query", address);
  url.searchParams.set("lang", "cs");
  url.searchParams.set("limit", "1");
  url.searchParams.set("type", "regional");
  url.searchParams.set("locality", "cz,sk");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const item = data?.items?.[0];
  if (!item?.position) return null;

  return {
    lat: item.position.lat,
    lng: item.position.lon,
    address: item.name || address,
    placeId: `mapy-${item.position.lat}-${item.position.lon}`,
  };
}
```

**Key detail:** The Mapy.cz suggest API uses `position.lon` (not `lng`). The existing `address-autocomplete-mapy.tsx` line 133 confirms this: `lng: suggestion.position.lon`.

**The `shouldUnregister` fix:**
```typescript
// In ride-form.tsx, modify useForm call
const form = useForm<CreateRide>({
  resolver: zodResolver(CreateRideSchema),
  defaultValues: {
    seatsTotal: 4,
    bookingMode: "request",
    notes: "",
  },
  shouldUnregister: false,  // <-- ADD THIS
});
```

Without this, when the wizard moves from step 0 to step 1, fields on step 0 get unregistered and their values are lost. The AI handler on step 0 sets `seatsTotal` (step 1 field) and `priceCzk` (step 2 field) via `form.setValue()`, but these values vanish when the user navigates to those steps because the fields were unregistered.

### Pattern 2: Client-Supplied UUID for Chat Dedup (BUG-02)

**What:** Pass the client-generated UUID to `send_chat_message` RPC so the server-inserted row has the same ID as the optimistic message.

**SQL migration:**
```sql
-- Alter send_chat_message to accept optional client UUID
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_message_id UUID DEFAULT NULL  -- client can supply
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_message_id UUID;
  -- ... (same variables as current)
BEGIN
  -- ... (same validation logic as current)

  -- Use client-supplied ID or generate new one
  v_message_id := COALESCE(p_message_id, uuid_generate_v4());

  -- Insert message with explicit ID
  INSERT INTO public.chat_messages (id, conversation_id, sender_id, content, message_type)
  VALUES (v_message_id, p_conversation_id, v_sender_id, p_content, p_message_type);

  RETURN v_message_id;
END;
$$;
```

**Client-side change in chat-view.tsx:**
```typescript
// Pass optimistic ID to RPC
const { error } = await supabase.rpc("send_chat_message", {
  p_conversation_id: conversationId,
  p_content: content,
  p_message_type: messageType,
  p_message_id: optimisticId,  // <-- ADD THIS
});
```

**Why this works:** The Postgres Changes listener already checks `prev.some((m) => m.id === newMsg.id)` (line 79). When the server row has the same UUID as the optimistic message, the dedup check will find it and replace instead of appending.

### Pattern 3: Map Picker Geocoding Fix (BUG-03)

**What:** Add `setIsGeocoding(false)` to the success path of `reverseGeocode`.

**Current code (map-location-picker.tsx lines 31-51):**
```typescript
const reverseGeocode = useCallback(async (lat: number, lng: number) => {
  setIsGeocoding(true);
  try {
    const res = await fetch(...);
    if (res.ok) {
      const data = await res.json();
      const items = data?.items;
      if (items && items.length > 0) {
        setAddress(items[0].name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        return;  // <-- BUG: returns WITHOUT calling setIsGeocoding(false)
      }
    }
  } catch {
    // Fallback to coordinate display
  }
  setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  setIsGeocoding(false);  // <-- Only reached on failure/fallback
}, []);
```

**Fix:** Move `setIsGeocoding(false)` into a `finally` block, or add it before the `return` on line 43.

**Recommended approach (cleanest):**
```typescript
const reverseGeocode = useCallback(async (lat: number, lng: number) => {
  setIsGeocoding(true);
  try {
    const res = await fetch(...);
    if (res.ok) {
      const data = await res.json();
      const items = data?.items;
      if (items && items.length > 0) {
        setAddress(items[0].name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        return;
      }
    }
    // Fallback
    setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  } catch {
    setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  } finally {
    setIsGeocoding(false);  // <-- Always runs
  }
}, []);
```

### Pattern 4: Future Time Filtering (BUG-04)

**What:** When today's date is selected, disable past hours. When today's date AND current hour is selected, disable past minutes.

**Current code:** `date-time-picker.tsx` shows all 24 HOURS and all 12 MINUTES options unconditionally (lines 228-249).

**Fix approach:**
```typescript
// Compute which hours/minutes are available based on selected date
const now = new Date();
const isToday = selectedDate === format(now, "yyyy-MM-dd");
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// In hour <select>, disable past hours when today is selected
{HOURS.map((h) => {
  const hourNum = parseInt(h, 10);
  const isPastHour = isToday && hourNum < currentHour;
  return (
    <option key={h} value={h} disabled={isPastHour}>
      {h}
    </option>
  );
})}

// In minute <select>, disable past minutes when today + current hour selected
{MINUTES.map((m) => {
  const minNum = parseInt(m, 10);
  const isPastMinute = isToday && parseInt(selectedHour, 10) === currentHour && minNum < currentMinute;
  return (
    <option key={m} value={m} disabled={isPastMinute}>
      {m}
    </option>
  );
})}
```

**Edge case:** If user selects today and has a past hour selected, auto-advance to the next valid hour. Similarly for minutes.

**Important consideration:** The `today` constant is currently computed with `useMemo(() => startOfDay(new Date()), [])` which means it never updates. For hour/minute filtering, we need a fresh `new Date()` in the filtering logic (not memoized), since the current hour changes as the user interacts.

### Pattern 5: Admin Role Setup (ADMIN-05, ADMIN-06)

**What:** Set `app_metadata.is_admin = true` on the `bujnmi@gmail.com` user.

**How the admin system already works:**
1. SQL function `is_admin()` reads `app_metadata.is_admin` from JWT (migration 07, line 49-59)
2. Middleware checks `user?.app_metadata?.is_admin === true` for `/admin` routes (middleware.ts line 119)
3. Admin panel pages exist at `/admin/*` (dashboard, reports, users, events, reviews)

**The missing piece:** No user currently has `is_admin: true` in their `app_metadata`.

**Setting admin via Supabase Admin API:**
```typescript
// One-time script using service role key
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Find user by email
const { data: { users } } = await supabase.auth.admin.listUsers();
const adminUser = users.find(u => u.email === 'bujnmi@gmail.com');

if (adminUser) {
  await supabase.auth.admin.updateUserById(adminUser.id, {
    app_metadata: { is_admin: true },
  });
}
```

**Options for implementation:**
1. **Supabase CLI script** (recommended): Create a seed/setup script in `supabase/` that can be run once
2. **SQL migration**: Not suitable because `auth.users` is in the `auth` schema and `app_metadata` is managed by Supabase Auth, not direct SQL
3. **Supabase dashboard**: Manual, but fragile and not reproducible
4. **Edge Function**: Overkill for a one-time operation

**Recommended approach:** Create a TypeScript setup script (e.g., `supabase/scripts/set-admin.ts`) that uses the Supabase Admin API. This is reproducible, version-controlled, and can be run in any environment.

### Anti-Patterns to Avoid

- **Timestamp-based chat dedup:** Don't deduplicate by `(sender_id, content, created_at within N seconds)` -- this is fragile and breaks if the user sends the same message twice intentionally. Client-supplied UUID is deterministic and reliable.
- **Geocoding in the AI Edge Function:** Don't move geocoding into the `ai-assistant` Edge Function. The ride form needs `PlaceResult` objects in client state to trigger route computation. Geocoding must happen on the client side.
- **Memoizing current time for filtering:** Don't memoize `new Date()` in the time picker filtering. The current hour changes while the user is interacting with the form.
- **Direct SQL UPDATE on auth.users:** Don't try to update `raw_app_meta_data` directly in a migration. Use the Supabase Admin API which handles JWT refresh and cache invalidation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Forward geocoding | Custom geocoder | Mapy.cz `/v1/geocode` API | Already using Mapy.cz for suggest and reverse geocode; consistent API surface |
| UUID generation | Custom dedup logic | `crypto.randomUUID()` + pass to RPC | Browser built-in, guaranteed unique, avoids timestamp-based hacks |
| Date/time comparison | Manual date math | `date-fns` `isBefore`, `startOfDay` | Already in project, handles timezone edge cases |
| Admin metadata | Custom role table | Supabase `app_metadata` | Already used by `is_admin()` function, middleware, and RLS policies |

## Common Pitfalls

### Pitfall 1: Mapy.cz API `position.lon` vs `lng`
**What goes wrong:** Coordinate swap when converting Mapy.cz geocode response to PlaceResult.
**Why it happens:** Mapy.cz API uses `position.lon` (longitude) while the app's `PlaceResult` interface uses `lng`. Off-by-one naming.
**How to avoid:** Always map `position.lon -> lng` explicitly. Confirmed in existing code: `address-autocomplete-mapy.tsx` line 133.
**Warning signs:** Map shows markers in wrong location (swapped lat/lng or using lon where lng expected).

### Pitfall 2: react-hook-form `shouldUnregister` scope
**What goes wrong:** Setting `shouldUnregister: false` at form level means ALL fields persist values even when unmounted. This is intentional for the wizard but could cause stale values if fields are conditionally shown.
**Why it happens:** React Hook Form's default is `shouldUnregister: true` for memory efficiency, but wizard forms need `false`.
**How to avoid:** Set at form level (not per-field). Test that navigating back and forth preserves values correctly.
**Warning signs:** Form submits with stale or unexpected values from previous wizard steps.

### Pitfall 3: Chat RPC migration must use CREATE OR REPLACE
**What goes wrong:** Migration fails because `send_chat_message` already exists.
**Why it happens:** The function was created in migration `00000000000004_chat.sql`.
**How to avoid:** Use `CREATE OR REPLACE FUNCTION` in the new migration. The function signature with the new optional parameter is compatible.
**Warning signs:** Migration error: "function already exists".

### Pitfall 4: Time picker auto-correction on date change
**What goes wrong:** User selects 8:00 AM, then changes date to today. If current time is 10:00 AM, the selected 8:00 is now in the past but still displayed.
**Why it happens:** Date change doesn't trigger re-validation of time selection.
**How to avoid:** Add a `useEffect` that watches `selectedDate` and auto-advances `selectedHour`/`selectedMinute` to the next valid value if current selection is in the past.
**Warning signs:** User can submit a ride with a past departure time when today is selected.

### Pitfall 5: Admin setup requires user to exist first
**What goes wrong:** Admin setup script fails because `bujnmi@gmail.com` hasn't signed up yet.
**Why it happens:** Supabase Auth `admin.updateUserById` requires the user to exist.
**How to avoid:** Either (a) ensure user signs up first, or (b) use `admin.createUser` with the email and admin flag if user doesn't exist. The setup script should handle both cases.
**Warning signs:** Script silently fails; user has no admin access.

## Code Examples

### Mapy.cz Forward Geocode API Call
```typescript
// Source: Mapy.cz developer docs (https://developer.mapy.com/rest-api-mapy-cz/function/geocoding/)
// Pattern matches existing suggest API usage in address-autocomplete-mapy.tsx

const url = new URL("https://api.mapy.cz/v1/geocode");
url.searchParams.set("apikey", MAPY_API_KEY);
url.searchParams.set("query", "Ostrava");
url.searchParams.set("lang", "cs");
url.searchParams.set("limit", "1");
url.searchParams.set("type", "regional");
url.searchParams.set("locality", "cz,sk");

const res = await fetch(url.toString(), {
  headers: { Accept: "application/json" },
});
const data = await res.json();
// data.items[0].position = { lat: 49.8209, lon: 18.2625 }
// data.items[0].name = "Ostrava"
```

### Supabase Admin API: Set app_metadata
```typescript
// Source: Supabase Auth Admin API docs
// Pattern matches existing admin usage in delete-account/index.ts

const { error } = await supabase.auth.admin.updateUserById(userId, {
  app_metadata: { is_admin: true },
});
```

### react-hook-form shouldUnregister
```typescript
// Source: react-hook-form docs
// Prevents wizard step changes from unregistering fields

const form = useForm<CreateRide>({
  resolver: zodResolver(CreateRideSchema),
  defaultValues: { seatsTotal: 4, bookingMode: "request", notes: "" },
  shouldUnregister: false,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Timestamp-based chat dedup | Client-supplied UUID dedup | Common pattern since Supabase Realtime v2 | Deterministic, no race conditions |
| `shouldUnregister: true` default | `shouldUnregister: false` for wizards | react-hook-form v7+ | Must opt-in for multi-step forms |
| Manual admin role tables | Supabase `app_metadata` claims | Supabase best practice | JWT-based, no extra DB queries |

## Open Questions

1. **Mapy.cz geocode vs suggest API for AI addresses**
   - What we know: Both `/v1/geocode` and `/v1/suggest` can resolve addresses to coordinates. The project already uses `/v1/suggest` for autocomplete.
   - What's unclear: Whether `/v1/geocode` or `/v1/suggest` gives better results for short city names like "Praha", "Brno", "Ostrava" that the AI typically returns.
   - Recommendation: Use `/v1/geocode` (designed for exact geocoding) rather than `/v1/suggest` (designed for interactive autocomplete). The `type: "regional"` filter and `locality: "cz,sk"` bias should give good results for Czech/Slovak city names. If results are poor, fall back to `/v1/suggest` as alternative.

2. **Admin setup: create-or-update vs update-only**
   - What we know: The setup script needs to set `is_admin: true` on `bujnmi@gmail.com`.
   - What's unclear: Whether this user account already exists in production.
   - Recommendation: Script should first try to find the user by email. If found, update. If not found, either create the user or log a clear message saying "user must sign up first". Creating a user without their consent may be unexpected.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `ride-form.tsx`, `chat-view.tsx`, `map-location-picker.tsx`, `date-time-picker.tsx`, `middleware.ts` -- direct code inspection
- Codebase analysis: `00000000000004_chat.sql` (send_chat_message RPC), `00000000000007_safety.sql` (is_admin function)
- Prior research: `.planning/research/FEATURES.md`, `.planning/research/SUMMARY.md` -- confirmed bug analysis and recommended fixes

### Secondary (MEDIUM confidence)
- [Mapy.cz developer docs](https://developer.mapy.com/rest-api-mapy-cz/function/geocoding/) -- forward geocode API parameters
- [Mapy.cz geocode queries](https://developer.mapy.com/rest-api-mapy-cz/function/geocoding/queries-and-data/) -- query/response format
- Supabase Auth Admin API -- `updateUserById` for `app_metadata` (well-documented, used elsewhere in codebase)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all fixes use existing project libraries and APIs
- Architecture: HIGH -- all bug root causes confirmed via direct code inspection, fixes are surgical
- Pitfalls: HIGH -- pitfalls derived from confirmed code patterns and prior research

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (stable domain, no external dependency changes expected)
