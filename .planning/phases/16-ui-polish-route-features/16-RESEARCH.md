# Phase 16: UI Polish & Route Features - Research

**Researched:** 2026-02-17
**Domain:** UI polish, Leaflet map customization, PostGIS waypoint search, React form state
**Confidence:** HIGH

## Summary

Phase 16 combines six UI polish items (UX-01 through UX-06, where UX-04 is already done) with three route waypoint features (ROUTE-01 through ROUTE-03). The UI polish items are straightforward modifications to existing components with clear, isolated scopes. The waypoint features are the largest work area: the database schema (`ride_waypoints` table) and RLS policies already exist from Phase 3, but the ride creation form, route map display, and search RPC all need waypoint integration.

The map location picker uses Leaflet with Mapy.cz tiles, not Google Maps. The MapLocationPicker component currently hardcodes its center to `[49.8, 15.5]` (Czech Republic) at zoom 7. Adding initial coordinate props is a simple change. The StarRating component already has a "New" badge for unrated users but displays the English text "New" instead of localized "Novy"/"Novy". The ride form is 981 lines and already imports MapLocationPicker. Waypoint UI will be added to step 1 (route step) of the wizard. The `nearby_rides` RPC currently only matches against `route_geometry`, `origin_location`, and `destination_location` -- it does not check `ride_waypoints` at all, so ROUTE-03 requires an SQL migration to extend this function.

**Primary recommendation:** Implement the six UI polish items first (they are independent and low-risk), then tackle ROUTE-01/02/03 as a connected unit since they share the waypoint data model.

<user_constraints>
## User Constraints (from phase context)

### Locked Decisions
- Max 5 intermediate waypoints per ride
- ride-form.tsx was modified in Phase 12 (AI fix) and Phase 14 (price slider) -- this is the final sequential modification
- UX-04 (price slider value below) was already done in Phase 14 as PRICE-03 -- DO NOT re-implement

### Claude's Discretion
- Waypoint UI component design within ride-form.tsx
- How to extend nearby_rides RPC for waypoint matching
- Notification settings grouping strategy (2-3 toggles)
- How to handle localization of "New" badge text

### Deferred Ideas (OUT OF SCOPE)
- Multiple route alternatives (deferred to v1.2, mutually exclusive with waypoints in Google API)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | Map location picker zooms to already-selected coordinates | MapLocationPicker at `map-location-picker.tsx` hardcodes center `[49.8, 15.5]` zoom 7. Add optional `initialLat`/`initialLng` props; when provided, use as center with zoom ~14-15. ride-form.tsx already has origin/destination state with lat/lng. |
| UX-02 | "Novy" badge instead of 0 stars for unrated users | StarRating at `star-rating.tsx` already shows "New" badge when `rating === 0 && count === 0` (line 25-30). Change hardcoded "New" to `t("common.new")` and add translation key "Novy"/"Novy"/"New" for cs/sk/en. |
| UX-03 | "Money Saved" hidden from impact dashboard and community stats | Impact dashboard at `impact-dashboard.tsx` shows "Money Saved" StatCard (lines 147-152) using `Wallet` icon. Community stats at `community-stats.tsx` does NOT show money saved (already absent). Only need to remove from impact dashboard. |
| UX-04 | Price slider shows value below | **ALREADY DONE in Phase 14 as PRICE-03. Skip entirely.** |
| UX-05 | My Rides single list without tabs | `my-rides/page.tsx` has `TopTab` (driver/passenger) and `SubTab` (upcoming/past). Remove SubTab; merge upcoming + past into single list per top tab. Sort: upcoming rides first (ascending departure), then past rides (descending departure). Keep the driver/passenger top tab. |
| UX-06 | Simplified notification settings (2-3 grouped toggles) | `notifications/page.tsx` has 9 individual toggles (6 push + 3 email). Simplify to 3 grouped toggles: (1) Push notifications (master), (2) Email notifications (master), (3) Ride reminders. DB schema has 9 boolean columns -- simplified UI sets all sub-values when group toggle changes. |
| ROUTE-01 | Driver can add intermediate waypoints when creating a ride | ride-form.tsx Step 1 (route step). Add waypoint list UI between origin/destination inputs. Max 5 waypoints (locked decision). Each waypoint uses AddressInput + optional MapLocationPicker. After ride creation, insert waypoints to `ride_waypoints` table. |
| ROUTE-02 | Waypoints displayed on route map and stored in ride data | RouteMap/RideMapMapy components need `waypoints` prop. Add blue circle markers at waypoint locations. ride-detail.tsx already receives `waypoints` prop but does not render them on map -- pass through to RouteMap. |
| ROUTE-03 | Passengers can search rides where waypoint is near their origin/destination | Extend `nearby_rides` RPC with LEFT JOIN to `ride_waypoints`. Add OR clauses to check if any waypoint is within radius of passenger's origin or destination. New SQL migration required. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Leaflet | already installed | Map rendering for MapLocationPicker and RideMapMapy | Currently used by the app with Mapy.cz tiles |
| react-hook-form | already installed | Form state management in ride-form.tsx | Already drives the ride creation wizard |
| @googlemaps/polyline-codec | already installed | Decode/encode route polylines | Already used for route geometry |
| PostGIS (extensions schema) | already installed | Spatial queries via ST_DWithin, ST_Distance | Powers the existing nearby_rides RPC |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | already installed | Icons (MapPin for waypoints, X for remove) | Waypoint UI elements |
| sonner | already installed | Toast notifications | Feedback on waypoint add/remove |

### Alternatives Considered
None -- all work uses existing stack.

**Installation:**
No new packages needed.

## Architecture Patterns

### Pattern 1: MapLocationPicker with Initial Coordinates
**What:** Extend MapLocationPicker interface to accept optional initial coordinates
**When to use:** UX-01 implementation
**Example:**
```typescript
interface MapLocationPickerProps {
  onConfirm: (lat: number, lng: number, address: string) => void;
  onCancel: () => void;
  initialLat?: number;  // NEW
  initialLng?: number;  // NEW
}

// In useEffect where map is created:
const center: [number, number] = (initialLat && initialLng)
  ? [initialLat, initialLng]
  : [49.8, 15.5];
const zoom = (initialLat && initialLng) ? 14 : 7;

const map = L.map(mapContainerRef.current, {
  center,
  zoom,
  zoomControl: true,
});
```

### Pattern 2: Waypoint State in Ride Form
**What:** Manage an array of waypoints in ride-form.tsx alongside origin/destination
**When to use:** ROUTE-01 implementation
**Example:**
```typescript
interface WaypointInput {
  address: string;
  lat: number;
  lng: number;
}

// State in RideForm
const [waypoints, setWaypoints] = useState<WaypointInput[]>([]);
const MAX_WAYPOINTS = 5;

// After createRide succeeds (ride.id available):
for (let i = 0; i < waypoints.length; i++) {
  await supabase.from('ride_waypoints').insert({
    ride_id: ride.id,
    location: `POINT(${waypoints[i].lng} ${waypoints[i].lat})`,
    address: waypoints[i].address,
    order_index: i,
    type: 'pickup',
  });
}
```

### Pattern 3: Extend nearby_rides for Waypoint Matching
**What:** Add waypoint proximity check to the search RPC
**When to use:** ROUTE-03 implementation
**Example:**
```sql
-- Add additional OR clause inside the origin/destination matching:
OR EXISTS (
  SELECT 1 FROM public.ride_waypoints rw
  WHERE rw.ride_id = r.id
  AND extensions.ST_DWithin(
    rw.location,
    extensions.ST_SetSRID(extensions.ST_MakePoint(origin_lng, origin_lat), 4326)::extensions.geography,
    radius_km * 1000
  )
)
-- Similar OR for destination matching against waypoints
```

### Pattern 4: Grouped Notification Toggles
**What:** Replace 9 individual toggles with 2-3 group toggles that set multiple DB columns
**When to use:** UX-06 implementation
**Example:**
```typescript
// Group 1: Push notifications (controls all 6 push_ columns)
// Group 2: Email notifications (controls all 3 email_ columns)
// Optional Group 3: Ride reminders (controls push_ride_reminders + email_ride_reminders)

async function handleGroupToggle(group: 'push' | 'email', value: boolean) {
  const updates = group === 'push'
    ? {
        push_booking_requests: value,
        push_booking_confirmations: value,
        push_booking_cancellations: value,
        push_new_messages: value,
        push_ride_reminders: value,
        push_route_alerts: value,
      }
    : {
        email_booking_confirmations: value,
        email_ride_reminders: value,
        email_cancellations: value,
      };
  // upsert all at once
}
```

### Anti-Patterns to Avoid
- **Re-requesting route when adding waypoints:** Google Routes API charges per request. Adding waypoints should NOT trigger a new route computation. Waypoints are separate pickup points along the existing route, not intermediate stops that change the route itself.
- **Separate migration for each UI change:** The only SQL migration needed is for ROUTE-03 (extending nearby_rides). All UI polish items are frontend-only.
- **Storing waypoints as JSONB on rides table:** The `ride_waypoints` table already exists with proper PostGIS geography columns and GIST indexes. Use it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spatial proximity matching | Custom distance calculation in JS | PostGIS ST_DWithin in nearby_rides RPC | Indexed spatial queries, server-side filtering |
| Polyline decoding | Custom decoder | @googlemaps/polyline-codec (already installed) | Edge cases in encoding |
| Waypoint storage | JSONB column on rides | Existing ride_waypoints table with PostGIS | Spatial indexing for ROUTE-03 search |

## Common Pitfalls

### Pitfall 1: MapLocationPicker initialLat/initialLng Race Condition
**What goes wrong:** The map initializes before props are set, showing default view briefly before jumping
**Why it happens:** Leaflet map center is set on creation, not easily changed afterward
**How to avoid:** Pass initialLat/initialLng directly to L.map() options during creation. Since the component already creates the map only once (guarded by `if (mapRef.current) return`), the initial coordinates will be used correctly on first render.
**Warning signs:** Map flickers or jumps from Czech Republic view to zoomed location

### Pitfall 2: Waypoint Insert After Ride Creation
**What goes wrong:** Ride is created but waypoint inserts fail, leaving orphaned ride without waypoints
**Why it happens:** No transaction wrapping ride + waypoint inserts from client-side
**How to avoid:** Insert waypoints sequentially after ride creation. If waypoint insert fails, show a warning but don't block navigation (ride exists, waypoints can be added later by editing). RLS policies already permit waypoint insert by ride driver.
**Warning signs:** Ride created but no waypoints visible on ride detail page

### Pitfall 3: nearby_rides RPC Performance with Waypoint JOIN
**What goes wrong:** Adding a JOIN + EXISTS subquery to nearby_rides slows down search
**Why it happens:** ride_waypoints table grows with more rides and waypoints
**How to avoid:** Use EXISTS subquery (not JOIN) to avoid row multiplication. The GIST index on `ride_waypoints.location` ensures ST_DWithin is fast. EXISTS stops scanning after first match.
**Warning signs:** Search page load time increases noticeably

### Pitfall 4: Notification Preferences Schema Mismatch
**What goes wrong:** Simplified UI toggles don't map cleanly to 9 DB columns
**Why it happens:** Reducing 9 toggles to 2-3 means a group toggle sets multiple columns
**How to avoid:** On load, compute group state: group is ON if ALL sub-values are ON, OFF if ALL are OFF, partial if mixed (show as ON). On toggle, set ALL columns in the group.
**Warning signs:** User toggles group ON but some sub-preferences remain OFF

### Pitfall 5: StarRating "New" Badge Not Localized
**What goes wrong:** Badge shows "New" in English instead of localized "Novy"
**Why it happens:** StarRating does not import useI18n hook
**How to avoid:** Import useI18n, add translation key `common.newUser` with values cs: "Novy", sk: "Novy", en: "New"
**Warning signs:** Czech users see English text on ride cards

## Code Examples

### Existing Code: MapLocationPicker (needs modification for UX-01)
```typescript
// File: apps/web/app/(app)/components/map-location-picker.tsx
// Line 59-63: Currently hardcoded center and zoom
const map = L.map(mapContainerRef.current, {
  center: [49.8, 15.5], // Czech Republic center -- CHANGE to use initialLat/initialLng
  zoom: 7,              // CHANGE to 14 when initial coords provided
  zoomControl: true,
});
```

### Existing Code: ride-form.tsx MapLocationPicker usage (caller for UX-01)
```typescript
// File: apps/web/app/(app)/components/ride-form.tsx
// Lines 870-875: Currently no initial coordinates passed
{showMapPicker && (
  <MapLocationPicker
    onConfirm={handleMapConfirm}
    onCancel={() => setShowMapPicker(null)}
    // ADD: initialLat={showMapPicker === "origin" ? origin?.lat : destination?.lat}
    // ADD: initialLng={showMapPicker === "origin" ? origin?.lng : destination?.lng}
  />
)}
```

### Existing Code: StarRating "New" badge (needs localization for UX-02)
```typescript
// File: apps/web/app/(app)/components/star-rating.tsx
// Lines 24-30: Hardcoded "New" text
if ((!rating || rating === 0) && count === 0) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      New  {/* CHANGE to t("common.newUser") */}
    </span>
  );
}
```

### Existing Code: Impact Dashboard "Money Saved" (remove for UX-03)
```typescript
// File: apps/web/app/(app)/impact/impact-dashboard.tsx
// Lines 147-152: Money Saved stat card -- REMOVE entirely
<StatCard
  icon={<Wallet className="h-5 w-5 text-secondary" />}
  label="Money Saved"
  value={formatPrice(impact?.total_money_saved_czk ?? 0)}
  gradient="from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30"
/>
```

### Existing Code: My Rides page (modify for UX-05)
```typescript
// File: apps/web/app/(app)/my-rides/page.tsx
// Lines 54, 88-89: SubTab state -- REMOVE
type SubTab = "upcoming" | "past";
const [subTab, setSubTab] = useState<SubTab>("upcoming");

// Lines 120-165: Separate filtering into upcoming/past -- MERGE into single sorted list
// New approach: combine all rides, sort upcoming first (asc) then past (desc)
```

### Existing Code: Notification settings (simplify for UX-06)
```typescript
// File: apps/web/app/(app)/settings/notifications/page.tsx
// Lines 42-99: 6 push + 3 email individual categories
// Replace with 2-3 group toggles that set all sub-values at once
```

### Existing Code: ride_waypoints table schema (used by ROUTE-01/02/03)
```sql
-- File: supabase/migrations/00000000000002_rides.sql
-- Lines 127-138: Already exists
CREATE TABLE public.ride_waypoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address TEXT NOT NULL,
  order_index INT NOT NULL,
  type TEXT DEFAULT 'pickup' CHECK (type IN ('pickup', 'dropoff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- GIST index and RLS already configured
```

### Existing Code: nearby_rides RPC (extend for ROUTE-03)
```sql
-- File: supabase/migrations/00000000000008_ride_search.sql
-- The existing WHERE clause matches origin/destination locations and route_geometry.
-- For ROUTE-03, add OR EXISTS subqueries that check ride_waypoints proximity.
```

### Existing Code: ride-detail.tsx already fetches waypoints
```typescript
// File: apps/web/app/(app)/rides/[id]/page.tsx
// Line 86: Already fetching waypoints
const [{ data: ride }, { data: waypoints }, { data: bookings }] = await Promise.all([...]);
// Line 183: Already passing to RideDetail
waypoints={(waypoints ?? []) as ...}
```

### Existing Code: RouteMap components (extend for ROUTE-02)
```typescript
// File: apps/web/app/(app)/components/route-map.tsx
// Currently accepts: encodedPolyline, originLat, originLng, destLat, destLng
// ADD: waypoints?: { lat: number; lng: number; address: string }[]
// Both RideMapMapy and RideMap need waypoint markers (blue circles)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Maps for all map features | Leaflet + Mapy.cz tiles (MapLocationPicker, RideMapMapy) | Current codebase | No Google Maps dependency for map picker and route display |
| 9 notification toggles | Industry standard: 2-3 grouped controls | Common UX pattern | Simpler settings page, better user experience |

## Open Questions

1. **Should waypoints trigger route recalculation?**
   - What we know: Currently the route is computed once from origin to destination using Google Routes API. Waypoints are conceptual "pickup points along the route," not route-altering stops.
   - What's unclear: Should adding a waypoint that's far from the existing route trigger a recalculation with the waypoint as an intermediate destination?
   - Recommendation: NO route recalculation for v1.1. Waypoints are informational pickup points along the existing route. Route recalculation with waypoints is a v1.2 feature. This keeps the implementation simple and avoids additional Google Routes API costs.

2. **Should the "Novy" badge be gender-aware?**
   - What we know: Czech has grammatical gender. "Novy" (masculine) vs "Nova" (feminine) vs "Nove" (neuter).
   - What's unclear: Whether we know the user's gender.
   - Recommendation: Use "Novy" (masculine) as the generic form, matching common Czech app conventions. The existing TODO document uses "Novy". User profiles don't store gender.

3. **My Rides: Keep or remove driver/passenger top tabs?**
   - What we know: The requirement says "single list without tab switcher" but only specifies removing upcoming/past sub-tabs. The driver/passenger distinction is structural.
   - What's unclear: Whether the top-level driver/passenger tabs should also be removed.
   - Recommendation: Keep the driver/passenger top tabs. Only remove the upcoming/past sub-tabs, merging those into a single chronological list within each tab. This matches the TODO-ux-improvements.md #24 description exactly.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files mentioned in this research
- `supabase/migrations/00000000000002_rides.sql` -- ride_waypoints table schema
- `supabase/migrations/00000000000008_ride_search.sql` -- nearby_rides RPC
- `apps/web/app/(app)/components/map-location-picker.tsx` -- MapLocationPicker component
- `apps/web/app/(app)/components/star-rating.tsx` -- StarRating component
- `apps/web/app/(app)/impact/impact-dashboard.tsx` -- Impact dashboard with Money Saved
- `apps/web/app/(app)/community/community-stats.tsx` -- Community stats (no Money Saved)
- `apps/web/app/(app)/my-rides/page.tsx` -- My Rides with tabs
- `apps/web/app/(app)/settings/notifications/page.tsx` -- Notification settings
- `apps/web/app/(app)/components/ride-form.tsx` -- Ride creation form (981 lines)
- `apps/web/app/(app)/components/ride-detail.tsx` -- Ride detail (already receives waypoints)
- `apps/web/app/(app)/components/route-map.tsx` -- Route map switcher
- `apps/web/app/(app)/components/ride-map-mapy.tsx` -- Leaflet map for route display
- `apps/web/app/(app)/components/ride-map.tsx` -- Google Maps for route display
- `packages/shared/src/queries/rides.ts` -- getRideWaypoints already exists
- `packages/shared/src/queries/search.ts` -- searchNearbyRides calls nearby_rides RPC

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and in use
- Architecture: HIGH - extending existing patterns with well-defined interfaces
- Pitfalls: HIGH - based on direct code inspection of all affected files

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days - stable codebase patterns)
