# Pitfalls Research

**Domain:** Community ride-sharing / carpooling platform
**Researched:** 2026-02-15
**Confidence:** MEDIUM-HIGH (verified against official docs where possible)

## Critical Pitfalls

### Pitfall 1: Supabase Realtime Postgres Changes Single-Thread Bottleneck

**What goes wrong:**
Developers use Postgres Changes (the simplest Supabase Realtime method) for chat messages and location updates. It works perfectly in development. At scale, messages arrive late, out of order, or are dropped entirely. Postgres Changes processes all changes on a single thread to maintain ordering, and compute upgrades do not improve this. This is an architectural constraint, not a bug.

**Why it happens:**
Postgres Changes is the easiest Realtime pattern -- subscribe to a table, get INSERT/UPDATE/DELETE events. Tutorials default to it. Developers don't discover the bottleneck until they have real concurrent users.

**How to avoid:**
Use Supabase Broadcast (not Postgres Changes) for chat and location sharing from the start. The architecture should be:
1. Client sends message via REST/RPC to insert into database
2. Database trigger or Edge Function publishes to Broadcast channel
3. Other clients receive via Broadcast subscription (no single-thread bottleneck)

This is explicitly recommended by Supabase's own documentation for scale: "use Realtime server-side only and then re-stream the changes to your clients using a Realtime Broadcast."

**Warning signs:**
- Chat messages arriving 2-5 seconds late under moderate load
- Location updates becoming "choppy" with 10+ concurrent tracked rides
- Realtime Reports dashboard showing high latency on Postgres Changes

**Phase to address:** Phase 1 (Foundation) -- bake Broadcast into the architecture from day one. Retrofitting from Postgres Changes to Broadcast requires rewriting all real-time subscription logic.

**Confidence:** HIGH -- verified via [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime/limits) and [Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks)

---

### Pitfall 2: Supabase Realtime Connection Limits Surprise

**What goes wrong:**
The Free plan allows only 200 concurrent Realtime connections. The Pro plan allows only 500 (or 10,000 with spend cap disabled). Each browser tab or app instance is one connection. A ride-sharing app with chat + location sharing can easily consume 2-3 subscriptions per active user. At 100 concurrent users on Pro plan, you hit the limit and new connections silently fail.

**Why it happens:**
Developers count "users" not "connections." Each Supabase channel subscription is a connection. A user viewing a ride with chat + location + presence = 3 channels. Background location sharing adds another. Connection counts multiply fast.

**How to avoid:**
- Multiplex subscriptions: use one channel per ride (not separate channels for chat, location, presence)
- Implement connection pooling: disconnect channels when user navigates away from a ride
- Use Broadcast for ephemeral data (location) to reduce Postgres Changes subscriptions
- Budget connections early: Free plan = ~60-100 concurrent active users max; Pro plan = ~150-300; Pro no-spend-cap = ~3,000-5,000
- Monitor via Supabase Realtime Reports dashboard

**Warning signs:**
- Users reporting "chat not updating" or "location frozen" intermittently
- Realtime Peak Connections metric approaching plan limit
- Overage charges appearing on Supabase bill ($10 per 1,000 peak connections)

**Phase to address:** Phase 1 (Foundation) -- design subscription architecture with multiplexing from the start. Phase 2+ monitor and optimize.

**Confidence:** HIGH -- verified via [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits) and [Pricing](https://supabase.com/docs/guides/realtime/pricing)

---

### Pitfall 3: Background Location Tracking App Store Rejection

**What goes wrong:**
Both Apple and Google reject apps that request background location without sufficient justification. Google Play specifically rejects apps with ACCESS_BACKGROUND_LOCATION in the manifest unless the developer can demonstrate a core feature requiring it. Apple requires NSLocationAlwaysUsageDescription and "Always" location permission, which triggers extra review scrutiny.

**Why it happens:**
Live location sharing during rides requires background location access -- the feature literally cannot work without it. But app store reviewers see background location as a red flag (privacy abuse vector). Developers submit their app and get rejected, losing days or weeks in the review cycle.

**How to avoid:**
1. Only request background location when the user starts sharing their ride (not at app launch)
2. Provide clear, specific usage descriptions: "Location is shared with your ride companions only during active rides so they can find you at the pickup point"
3. On Android: explicitly add ACCESS_BACKGROUND_LOCATION only via expo-location config plugin, not in the manifest directly
4. On iOS: use `NSLocationWhenInUseUsageDescription` first, escalate to `NSLocationAlwaysAndWhenInUseUsageDescription` only when user activates location sharing
5. Prepare a video demonstrating the feature for app store review teams
6. Implement a foreground service notification on Android showing "Sharing location with ride companions"

**Warning signs:**
- App store rejection email citing "background location" or "unnecessary permissions"
- Users denying "Always" location permission (iOS gives "When in Use" by default)
- Android 12+ users not seeing location updates when app is backgrounded

**Phase to address:** Phase dealing with location sharing -- must be addressed before first app store submission. Requires a pre-submission compliance review.

**Confidence:** MEDIUM-HIGH -- verified via [Expo Location Docs](https://docs.expo.dev/versions/latest/sdk/location/) and multiple [Expo GitHub issues](https://github.com/expo/expo/issues/11918)

---

### Pitfall 4: The Cold Start / Chicken-and-Egg Problem

**What goes wrong:**
The platform launches with zero rides. New users open the app, see no rides, and never return. Drivers don't post rides because there are no passengers. Passengers don't sign up because there are no rides. This is the #1 killer of carpooling apps -- not technical failures, but empty marketplaces.

**Why it happens:**
Network effects require critical mass. Ride-sharing is especially brutal because matches require geographic AND temporal overlap. Even 1,000 users won't produce matches if they're spread across a country. A Hacker News discussion on "Why do carpool apps always fail?" identified insufficient user density as the primary cause: "Outside of some very high traffic routes, I don't think there's enough people going from close enough to close enough."

**How to avoid:**
1. Launch hyper-locally: target a single festival/community/university, not "Czech Republic"
2. Seed the marketplace: get organizers/communities to pre-post rides before launch
3. Show "near-miss" rides: "3 people are going to Brno this weekend" even without exact matches
4. Allow ride requests (not just offers) so both sides populate the marketplace
5. Build community features first (profiles, social links) to give value even without ride matches
6. Partner with specific events/festivals where concentrated demand exists (aligned with "festapp" branding)

**Warning signs:**
- Search results consistently returning 0 rides
- High signup-to-churn ratio (people sign up, search, find nothing, leave)
- Rides being posted but never booked

**Phase to address:** Phase 1 must include ride requesting (not just offering). Launch strategy should target a specific community/event, not general public.

**Confidence:** HIGH -- well-documented pattern across [HN discussion](https://news.ycombinator.com/item?id=31329476) and ride-sharing industry

---

### Pitfall 5: Naive Geospatial Route Matching

**What goes wrong:**
Developers implement ride search as simple origin-destination point matching: "find rides within X km of my start point AND within X km of my end point." This misses rides where the driver passes through or near the passenger's route without having matching start/end points. A driver going Praha-Brno should match a passenger going Praha-Jihlava, but point-matching won't find it.

**Why it happens:**
Point-to-point matching is straightforward with PostGIS `ST_DWithin`. Route corridor matching requires storing the actual route geometry (a LINESTRING, not two POINTs) and doing `ST_DWithin` against a line, which is more complex and requires the route to be computed at ride creation time.

**How to avoid:**
1. Enable PostGIS extension in Supabase (it's available but not enabled by default)
2. Store rides with a route geometry (LINESTRING), not just origin/destination points
3. Use `ST_DWithin(route_geometry, passenger_point, radius)` for matching
4. Use Google/Mapbox Directions API to compute route geometry when driver posts a ride
5. Create spatial indexes (GiST) on route geometry columns
6. Start simple (point matching for MVP) but design the schema to support route matching from day one -- store both points AND route geometry

**Warning signs:**
- Users complaining "I know someone is driving my route but the app doesn't show it"
- Low match rates despite decent user base
- Only exact city-to-city matches working

**Phase to address:** Schema must support route geometry from Phase 1 (even if matching logic starts simple). Route corridor matching should be Phase 2-3.

**Confidence:** MEDIUM-HIGH -- verified PostGIS availability in Supabase via [official docs](https://supabase.com/docs/guides/database/extensions/postgis); route matching patterns from [PostGIS ride matching guide](https://medium.com/@deepdeepak2222/how-to-implement-a-ride-matching-system-using-postgres-postgis-and-python-93cdcc5d0d55)

---

### Pitfall 6: Battery Drain Killing User Retention

**What goes wrong:**
Live location sharing continuously polls GPS at high accuracy, draining the phone battery 3-5x faster than normal usage. Users share their location for one ride, notice their battery dropping rapidly, and disable location sharing (or uninstall the app entirely). One real-world case study showed a 70% battery reduction was possible but only with careful adaptive tracking.

**Why it happens:**
The default `Accuracy.Highest` setting with frequent polling (every 1-2 seconds) is what developers test with because it produces smooth map updates. But it's catastrophic for battery life on real rides lasting 1-4 hours.

**How to avoid:**
1. Use adaptive tracking: `Accuracy.Balanced` (not `Highest`) as default
2. Increase update intervals: 10-15 seconds between updates for ride sharing (not 1 second)
3. Use `deferredUpdatesDistance` to batch updates -- only send when user moves >100m
4. Reduce accuracy when stationary (detect via accelerometer or lack of position change)
5. Show battery impact warning before enabling location sharing
6. Auto-stop location sharing when ride ends (obvious but often forgotten)
7. Use `distanceFilter` to skip updates when user hasn't moved significantly

**Warning signs:**
- User reviews mentioning battery drain
- Background location task consuming >5% battery per hour
- Users opting out of location sharing feature

**Phase to address:** Must be addressed in the same phase as location sharing. Do not ship location sharing without adaptive tracking -- first impressions matter.

**Confidence:** MEDIUM -- based on [Callstack battery optimization guide](https://www.callstack.com/blog/optimize-battery-drain-in-react-native-apps), [Software Mansion case study](https://blog.swmansion.com/optimizing-battery-usage-improving-crash-free-rate-in-a-react-native-app-9e80ba1f240a), and multiple React Native location articles

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using Postgres Changes for all Realtime | Faster initial dev, simpler code | Rewrites when scaling; single-thread bottleneck | Never for chat/location; OK for admin dashboards |
| Storing only origin/destination points (no route geometry) | Simpler schema, no Directions API needed | Poor matching, users can't find relevant rides | MVP only if schema has geometry column ready |
| Putting all business logic in RLS policies | No API layer needed | Impossible to debug, test, or migrate; performance issues | Simple read policies only; complex logic goes in Edge Functions |
| Skipping migration files (manual DB changes in Studio) | Fast iteration | Cannot replicate environment, no version control on schema | Never -- always use Supabase CLI migrations |
| Single channel per feature (chat channel, location channel, presence channel) | Clearer code separation | Connection count explosion, hits Realtime limits fast | Never -- multiplex into one channel per ride |
| Shared Expo/Next.js components without platform checks | Faster UI development | Runtime crashes from platform-specific APIs (e.g., `Linking`, `Alert`) | Only for truly cross-platform primitives (Text, View, etc.) |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth | Not configuring deep links for OAuth/magic links on mobile | Configure `expo-linking` scheme and Supabase redirect URLs for both web and native; test on physical devices early |
| Google Maps / Mapbox | Exposing API keys in client bundle | Use Supabase Edge Functions as proxy for geocoding/directions; embed map display keys (restricted by bundle ID) in native config only |
| Expo Push Notifications | Assuming ExpoPushToken works in development builds | Test push notifications on physical devices with EAS Build; Expo Go has limited push support |
| PostGIS | Calling PostGIS functions via Supabase client without RPC | Create PostgreSQL functions that wrap PostGIS queries, expose via `supabase.rpc()` -- direct PostGIS SQL isn't available through the REST API |
| Expo Location (background) | Requesting background permission at app launch | Request only when user activates location sharing; provide clear explanation screen first; handle denial gracefully |
| Supabase Storage (profile photos) | Not setting up storage policies | Storage requires separate RLS-like policies; without them, uploads silently fail or become public |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded ride search queries | Slow search, DB timeouts | Always use spatial indexes + limit results + paginate; use bounding box pre-filter before distance sort | >10,000 rides in database |
| Loading all chat messages on room open | Slow room load, high bandwidth | Paginate messages (load last 50, scroll to load more); use cursor-based pagination | >500 messages in a conversation |
| Storing location history in main rides table | Table bloats, all queries slow down | Separate `ride_locations` table with time-series design; consider TTL/cleanup for old location data | >100 active rides with location sharing |
| Re-rendering map on every location update | UI jank, dropped frames | Throttle map updates to 1-2 per second; use `React.memo` on marker components; batch updates | >5 markers updating simultaneously |
| Fetching user profiles inline with ride listings | N+1 query pattern | Use Supabase foreign table joins or create a denormalized ride listing view | >50 rides in search results |
| No connection cleanup on navigation | Connection leak, hits Realtime limits | Unsubscribe from channels in `useEffect` cleanup; use a global subscription manager | >20 concurrent active users |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Broadcasting exact GPS coordinates to all ride participants | Stalking risk; location data persists in database | Share approximate location until pickup; share precise location only for active pickups; delete location data after ride ends |
| No rate limiting on ride search | Scraping all ride data (origins, destinations, schedules) | Rate limit search API; require authentication; don't expose exact addresses in search results |
| Trusting client-side ride status updates | Users can fake ride completion, manipulate booking state | All status transitions via Supabase Edge Functions with server-side validation |
| Storing chat messages without sender verification | Message spoofing -- sending messages as another user | RLS policy: `auth.uid() = sender_id` on insert; never trust client-provided sender_id |
| No phone/email verification before ride booking | Fake accounts, spam rides, no accountability | Require verified email (Supabase Auth handles this) + phone verification for booking |
| Exposing user home/work addresses in ride data | Privacy violation; safety risk | Store only pickup points (not home addresses); allow users to set pickup points offset from actual location |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring full registration before browsing rides | Users bounce before seeing value | Allow browsing without account; require auth only for booking/posting |
| Showing "no rides found" with no next steps | Dead end; user leaves | Show nearby rides, suggest posting a ride request, show ride trends ("12 people traveled to Brno last week") |
| Complex ride posting form (20+ fields) | Drivers don't bother posting | Minimal form: origin, destination, date/time, seats. Everything else optional or auto-detected |
| No cancellation communication | Passengers stranded, angry | Auto-notify all passengers immediately on cancellation; suggest alternative rides |
| Map-only location input | Frustrating on mobile; imprecise | Text search with autocomplete (Google Places or Mapbox Search) with map confirmation |
| Notification spam for every chat message | Users mute notifications, miss important ones | Batch chat notifications; prioritize ride-status notifications (booking confirmed, driver departed, cancellation) |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Chat:** Often missing read receipts and typing indicators -- without them, users don't know if their message was seen, leading to duplicate messages and frustration
- [ ] **Ride search:** Often missing time-window matching -- a ride departing at 8:00 should appear for someone searching 7:30-8:30, not just exact matches
- [ ] **Location sharing:** Often missing permission denial handling -- what happens when a user denies location permission mid-ride? The UI freezes or crashes
- [ ] **Push notifications:** Often missing channel configuration on Android -- notifications work in dev but appear in "Miscellaneous" category in production, getting suppressed by OS
- [ ] **Booking flow:** Often missing concurrent booking handling -- two passengers can book the last seat simultaneously without optimistic locking
- [ ] **User profiles:** Often missing profile photo upload error handling -- large images, wrong formats, or storage policy issues cause silent failures
- [ ] **Ride completion:** Often missing the "ride didn't happen" flow -- what if driver never shows up? There's no status for abandoned rides
- [ ] **Deep links:** Often missing universal link / app link configuration -- sharing a ride link opens the website, not the app, even when installed

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Postgres Changes bottleneck (rewrite to Broadcast) | HIGH | Create Broadcast channel abstraction layer; migrate one feature at a time; keep Postgres Changes as fallback during transition |
| Point-only ride matching (need route matching) | MEDIUM | Add route geometry column; backfill existing rides via Directions API batch job; update search queries incrementally |
| App store rejection for background location | LOW-MEDIUM | Update permission descriptions; add pre-permission explanation screens; record demo video; resubmit (1-2 week delay) |
| Connection limit exceeded | MEDIUM | Implement subscription manager to multiplex channels; add connection pooling; upgrade Supabase plan as immediate band-aid |
| Battery drain complaints | MEDIUM | Ship adaptive tracking update; reduce polling frequency; add user-facing battery mode toggle; communicate fix in app update notes |
| Cold start / empty marketplace | HIGH | Pivot to community/event-specific launch; seed rides manually; add ride requests feature; partner with event organizers |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Realtime architecture (Broadcast vs Postgres Changes) | Phase 1: Foundation | Load test with 50+ concurrent connections; measure message latency |
| Connection limit management | Phase 1: Foundation | Monitor Realtime Reports; verify subscription cleanup in React DevTools |
| Schema supports route geometry | Phase 1: Foundation (schema) | PostGIS extension enabled; rides table has geometry column; spatial index exists |
| Background location app store compliance | Pre-submission (location sharing phase) | Submit test build to TestFlight/Internal Testing; verify permission flow on physical devices |
| Battery-efficient location tracking | Same phase as location sharing | Test 2-hour ride simulation; measure battery consumption; target <3% per hour |
| Cold start mitigation | Phase 1: Launch strategy | Ride request feature exists; target community identified; seed rides pre-launch |
| Geospatial route matching | Phase 2-3 (after basic search works) | Search finds "along the route" rides; verified with test rides on known routes |
| Chat message ordering and delivery | Chat implementation phase | Load test: 10 users sending simultaneously; verify message order consistency |
| Push notification reliability | Notification implementation phase | Test on Android 12+ physical device; verify notifications arrive when app killed; test notification channels |
| Concurrent booking race conditions | Booking implementation phase | Test: two users booking last seat simultaneously; verify only one succeeds |
| Trust and safety (fake accounts) | Phase 1: Auth setup | Email verification required; phone verification for booking; report mechanism exists |

## Sources

- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits) -- connection quotas and message rate limits (HIGH confidence)
- [Supabase Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing) -- plan-specific quotas and overage costs (HIGH confidence)
- [Supabase Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks) -- Postgres Changes single-thread constraint (HIGH confidence)
- [Supabase Broadcast Docs](https://supabase.com/docs/guides/realtime/broadcast) -- recommended alternative to Postgres Changes (HIGH confidence)
- [Supabase PostGIS Docs](https://supabase.com/docs/guides/database/extensions/postgis) -- geospatial extension availability and usage (HIGH confidence)
- [Expo Location Docs](https://docs.expo.dev/versions/latest/sdk/location/) -- background location permissions and configuration (HIGH confidence)
- [Expo Push Notifications FAQ](https://docs.expo.dev/push-notifications/faq/) -- known issues and rate limits (HIGH confidence)
- [Expo GitHub #11918](https://github.com/expo/expo/issues/11918) -- Android background location Play Store rejection (MEDIUM confidence)
- [HN: Why do carpool apps always fail?](https://news.ycombinator.com/item?id=31329476) -- marketplace dynamics and cold start (MEDIUM confidence)
- [Callstack: Battery Optimization in React Native](https://www.callstack.com/blog/optimize-battery-drain-in-react-native-apps) -- battery drain prevention strategies (MEDIUM confidence)
- [Software Mansion: Battery & Crash Rate Optimization](https://blog.swmansion.com/optimizing-battery-usage-improving-crash-free-rate-in-a-react-native-app-9e80ba1f240a) -- 70% battery reduction case study (MEDIUM confidence)
- [PostGIS Ride Matching](https://medium.com/@deepdeepak2222/how-to-implement-a-ride-matching-system-using-postgres-postgis-and-python-93cdcc5d0d55) -- route matching implementation pattern (LOW confidence, single source)
- [Supabase Common Mistakes](https://hrekov.com/blog/supabase-common-mistakes) -- RLS, migrations, vendor lock-in (MEDIUM confidence)
- [Turborepo + Expo + Next.js Guide](https://medium.com/better-dev-nextjs-react/setting-up-turborepo-with-react-native-and-next-js-the-2025-production-guide-690478ad75af) -- monorepo pitfalls (LOW confidence, single source)
- [SHIELD: Ride-Hailing Fraud](https://shield.com/blog/how-fraudsters-take-advantage-of-ride-hailing-app-how-to-protect-it) -- fake accounts and fraud patterns (MEDIUM confidence)

---
*Pitfalls research for: Festapp Rideshare -- community ride-sharing platform*
*Researched: 2026-02-15*
