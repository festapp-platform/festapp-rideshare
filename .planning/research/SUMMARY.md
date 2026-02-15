# Project Research Summary

**Project:** Festapp Rideshare
**Domain:** Long-distance community ride-sharing / carpooling platform
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

Festapp Rideshare is a community-owned, commission-free long-distance carpooling platform competing against BlaBlaCar in the European (initially Czech) market. The recommended approach is a Turborepo monorepo with Next.js 16 (web) and Expo SDK 54 (mobile) sharing types, validation schemas, and query builders through a common package, all backed by Supabase (PostgreSQL + PostGIS, Auth, Realtime, Edge Functions, Storage). This stack is well-documented, the patterns are proven in production, and there are no exotic technology bets. The primary competitive advantages are zero fees (cash payments between users), live location sharing for pickup coordination, and contact transparency after booking -- all areas where BlaBlaCar is deliberately weak due to its commission-based business model.

The architecture is a serverless BaaS pattern where Supabase handles auth, data, realtime, and serverless compute. PostGIS powers geospatial ride search. Row Level Security replaces a custom API authorization layer. Supabase Realtime Broadcast (not Postgres Changes) handles ephemeral data like live location and typing indicators, while Postgres Changes is reserved for persistent events like chat messages. The shared package (`@festapp/shared`) with Zod 4 schemas and typed query builders is the architectural linchpin -- it eliminates data contract drift between web, mobile, and Edge Functions.

The biggest risks are non-technical: the cold start / chicken-and-egg problem (empty marketplace kills carpooling apps) and naive geospatial matching (point-to-point search misses corridor rides). On the technical side, the critical pitfall is Supabase Realtime's single-thread Postgres Changes bottleneck -- using Broadcast from day one prevents a painful rewrite later. Realtime connection limits (200 free / 500 pro) require channel multiplexing from the start. Background location tracking requires careful app store compliance to avoid rejection. Battery drain from continuous GPS polling will kill user retention if not addressed with adaptive tracking.

## Key Findings

### Recommended Stack

The stack is pre-decided (Supabase, Next.js 16, Expo SDK 54, TypeScript, Turborepo) and well-chosen. Research validated these choices and identified the supporting libraries needed. Version compatibility is the main concern -- NativeWind v4.1 requires Tailwind CSS v3 (not v4), and Expo SDK 54 enforces New Architecture only.

**Core technologies:**
- **Supabase (PostgreSQL + PostGIS):** Backend -- auth, database, realtime, edge functions, storage in one platform. No server to manage.
- **Next.js 16 (App Router):** Web app with SSR/SSG for SEO on ride listings. React 19, Turbopack.
- **Expo SDK 54 (React Native 0.81):** Mobile app for iOS and Android. Primary interface for drivers/passengers.
- **Zod 4 + @festapp/shared:** Single source of truth for validation and types across all platforms.
- **TanStack Query 5:** Server state management with cache invalidation via Supabase Realtime.
- **Google Maps + react-native-maps:** Maps, geocoding, routing, place autocomplete. Google's free tier sufficient for community app.
- **NativeWind 4.1 + Tailwind CSS 3:** Cross-platform styling for shared UI components.
- **pnpm + Turborepo:** Monorepo orchestration with strict dependency resolution.

**Critical version constraints:**
- NativeWind v4.1 requires Tailwind CSS v3 (web app can independently use Tailwind v4)
- Expo SDK 54 requires React Native 0.81 + React 19.1, New Architecture only
- Zod 4 has breaking changes from Zod 3 -- do not mix versions
- @supabase/supabase-js 2.95 requires Node 20+ (dropped Node 18 in 2.79)

### Expected Features

**Must have (table stakes -- P1):**
- Phone auth + user profiles with photo -- trust foundation
- Ride posting (origin, destination, date/time, seats, price suggestion)
- Ride search with geographic proximity matching (not just exact city match)
- Booking system (instant-book and request-and-approve, driver's choice)
- In-app messaging for ride coordination
- Push notifications (booking requests, confirmations, messages, reminders)
- Mutual ratings and reviews (no auto-5-star like BlaBlaCar)
- Contact sharing after booking (phone number, WhatsApp/Telegram)
- Ride preferences (smoking, pets, music, chattiness)
- Price suggestion based on distance and fuel costs

**Should have (differentiators -- P2):**
- Live location sharing for pickup coordination -- genuine innovation, BlaBlaCar lacks this
- Suggested pickup points along route (gas stations, transit hubs)
- Social profile linking (Instagram, Facebook) for trust
- Flexible rides (route intent + subscriber notifications) -- potential killer feature
- Ride alerts (notify when matching route is posted)

**Defer (v2+):**
- Festapp event integration (explicitly deferred)
- Ladies Only rides (needs verification infrastructure)
- Admin panel (build when moderation problem exists, not before)
- In-app payments (cash-only IS the differentiator -- do not add payments)
- ID verification / document upload (phone + social links + ratings = adequate trust for v1)

### Architecture Approach

The architecture follows a serverless BaaS pattern: two client apps (web + mobile) sharing a common TypeScript package, backed entirely by Supabase services. PostgREST handles CRUD with RLS as the authorization layer. Edge Functions handle server-only logic (push notifications, price calculation). Realtime is split by purpose: Broadcast for ephemeral data (location, typing), Postgres Changes for persistent events (chat messages, booking updates), and Presence for online status. The monorepo structure isolates platform-specific code in `apps/` while sharing all business logic through `packages/shared`.

**Major components:**
1. **@festapp/shared package** -- types, Zod schemas, query builders. The architectural linchpin that prevents drift.
2. **PostgreSQL + PostGIS** -- all persistent data with geospatial ride search via `ST_DWithin` and GiST indexes.
3. **Supabase Auth** -- cookie-based sessions (web via @supabase/ssr) and SecureStore tokens (mobile). Different init, same downstream.
4. **Supabase Realtime** -- multiplexed channels per ride; Broadcast for location/typing, Postgres Changes for chat/bookings.
5. **Edge Functions** -- push notification dispatch, price suggestion, ride subscription matching. Stateless Deno functions.
6. **PostgREST + RLS** -- direct client CRUD with row-level security as the authorization layer. No custom API middleware.

### Critical Pitfalls

1. **Realtime Postgres Changes bottleneck** -- processes all changes on a single thread. Use Broadcast for chat and location from day one. Retrofitting is a full rewrite. (Phase 1)
2. **Realtime connection limits** -- 200 free / 500 pro concurrent connections. Each user can consume 2-3 channels. Multiplex into one channel per ride, unsubscribe on navigate away. (Phase 1)
3. **Cold start / empty marketplace** -- the #1 killer of carpooling apps. Launch hyper-locally (single festival/university), seed rides pre-launch, allow ride requests (not just offers). (Launch strategy)
4. **Naive geospatial matching** -- point-to-point search misses corridor rides. Design schema with route geometry column from day one; implement route corridor matching by Phase 3. (Phase 1 schema, Phase 3 logic)
5. **Background location app store rejection** -- both Apple and Google reject apps with background location unless justified. Request permission only during active location sharing, prepare demo video for reviewers. (Pre-submission)
6. **Battery drain from GPS tracking** -- use adaptive tracking (Accuracy.Balanced, 10-15 second intervals, distance filter). Do not ship location sharing without battery optimization. (Same phase as location sharing)

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Schema

**Rationale:** Everything depends on the database schema, auth, shared package, and monorepo structure. The Realtime architecture decision (Broadcast vs Postgres Changes) must be baked in from day one -- retrofitting is expensive.
**Delivers:** Working monorepo with both apps scaffolded, Supabase project with complete schema (including PostGIS geometry columns for future route matching), auth flow on both platforms, shared types/validation package.
**Addresses:** Phone auth, user profiles, photo upload to Supabase Storage.
**Avoids:** Pitfall 1 (Realtime architecture), Pitfall 2 (connection limits via multiplexing design), Pitfall 5 (schema supports route geometry from start).

### Phase 2: Core Ride Flow

**Rationale:** The core product loop (post ride, search rides, view details) is the foundation all other features build on. Geospatial search with PostGIS is the key technical challenge here.
**Delivers:** Drivers can post rides, passengers can search by route + date with geographic proximity, ride detail pages with driver profile and car info.
**Addresses:** Ride posting, ride search, ride details, price suggestion, ride preferences.
**Avoids:** Pitfall 4 (naive matching) by implementing proximity search; Pitfall 6 (cold start) by including ride requests alongside ride offers.

### Phase 3: Booking and Notifications

**Rationale:** Booking connects drivers and passengers -- the transactional core. Push notifications are required for booking flow (requests, approvals, reminders). These are tightly coupled.
**Delivers:** Full booking flow (instant + request/approve), push notifications on mobile, database triggers for side effects (seat decrement, notification dispatch).
**Addresses:** Booking system, push notifications, cancellation handling.
**Avoids:** Concurrent booking race conditions via database-level optimistic locking.

### Phase 4: Chat and Communication

**Rationale:** Chat enables post-booking coordination. Depends on booking (conversations are scoped to a booking). Uses Realtime Broadcast architecture decided in Phase 1.
**Delivers:** 1:1 chat between driver and passenger per ride, contact sharing after booking, typing indicators, read receipts.
**Addresses:** In-app messaging, contact sharing after booking.
**Avoids:** Pitfall 1 (uses Broadcast, not Postgres Changes for delivery).

### Phase 5: Ratings and Trust

**Rationale:** Ratings require completed rides. Trust features (social links, preference matching) enhance the core loop but do not block it.
**Delivers:** Post-ride mutual ratings/reviews, rating aggregation on profiles, social profile linking, ride completion flow.
**Addresses:** Mutual ratings/reviews, social profile linking, ride completion.

### Phase 6: Live Location and Maps

**Rationale:** Live location sharing is the highest-complexity differentiator. Depends on booking flow and Realtime Broadcast infrastructure. Must address battery drain and app store compliance simultaneously.
**Delivers:** Real-time driver location sharing during pickup, map overlay with live position, suggested pickup points along route.
**Addresses:** Live location sharing, suggested pickup points.
**Avoids:** Pitfall 3 (app store rejection via proper permission flow), Pitfall 6 (battery drain via adaptive tracking).

### Phase 7: Advanced Features

**Rationale:** Flexible rides and ride alerts are high-value differentiators that build on proven core features. They require their own UX patterns and subscription infrastructure.
**Delivers:** Flexible rides (route intent + subscriber notifications), ride alerts (notify on matching route).
**Addresses:** Flexible rides, ride alerts.

### Phase Ordering Rationale

- **Schema and shared package first** because every component depends on them. The architecture research is clear: shared query builders with platform-specific clients is the pattern. Build the foundation once, correctly.
- **Ride flow before booking** because browsing rides has value even without booking (validates marketplace viability). Also, ride search with PostGIS is the riskiest technical piece and should be de-risked early.
- **Booking before chat** because chat conversations are scoped to bookings. Chat without booking context has no purpose in this domain.
- **Ratings after booking** because you can only rate completed rides. This is a strict data dependency.
- **Live location last among core features** because it has the highest complexity (background location, app store compliance, battery optimization) and the core product works without it. It is a differentiator, not table stakes.
- **Flexible rides last** because they are a novel UX pattern requiring their own research and design iteration. The standard ride flow must be proven first.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Core Ride Flow):** PostGIS geospatial queries, route geometry storage, Google Directions API integration for route computation. Needs `/gsd:research-phase` to validate RPC function design and spatial index strategy.
- **Phase 6 (Live Location):** Background location permissions across iOS/Android, battery optimization strategies, Supabase Broadcast channel design for location streaming. Needs `/gsd:research-phase` for app store compliance requirements.
- **Phase 7 (Flexible Rides):** Novel UX pattern with no established competitor precedent. Subscription/notification model needs design research.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented Supabase + Turborepo + Expo monorepo setup. Official guides cover this completely.
- **Phase 3 (Booking):** Standard CRUD with database triggers. Well-documented Supabase patterns.
- **Phase 4 (Chat):** Supabase has official examples for realtime chat. react-native-gifted-chat is well-documented.
- **Phase 5 (Ratings):** Standard CRUD with aggregation triggers. No novel patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official docs and npm. Version compatibility matrix validated. Pre-decided stack reduces risk. |
| Features | MEDIUM | BlaBlaCar competitor analysis is solid (multiple review sources, official docs). Feature landscape well-mapped. Flexible rides concept is novel -- no competitor precedent to validate against. |
| Architecture | HIGH | Supabase architecture patterns verified against official documentation. PostGIS, Realtime, RLS patterns all have official examples. Monorepo structure follows established Expo + Next.js patterns. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (Realtime bottleneck, connection limits) verified against Supabase official docs and benchmarks. Battery optimization based on fewer sources (Callstack, Software Mansion). Cold start risk is well-documented across industry. |

**Overall confidence:** HIGH

### Gaps to Address

- **Route corridor matching implementation:** Research identified the need but the exact PostGIS query pattern for LINESTRING matching needs validation during Phase 2 planning. Only one source (Medium article) covers this pattern.
- **Supabase Broadcast for chat at scale:** The recommendation to use Broadcast instead of Postgres Changes for chat delivery is based on Supabase's own scaling advice, but there are fewer production examples of this pattern. Needs load testing during Phase 4.
- **Expo SDK 54 + Turborepo monorepo compatibility:** While Expo supports monorepos since SDK 52, the specific combination of Expo SDK 54 + Next.js 16 + Turborepo 2.8 has limited community examples. May encounter tooling issues during Phase 1.
- **NativeWind v4.1 cross-platform stability:** NativeWind v4 is stable but v5 is where active development is happening. Risk of v4 receiving fewer fixes as v5 matures.
- **Czech market viability:** No research was conducted on Czech-specific ride-sharing demand, competitor presence, or regulatory requirements. This is a business validation gap, not a technical one.
- **Cash payment logistics:** The "no payments" model is a feature, but edge cases (disputes about agreed price, no-shows after cash commitment) need UX solutions that were not deeply researched.

## Sources

### Primary (HIGH confidence)
- [Supabase Realtime Architecture & Limits](https://supabase.com/docs/guides/realtime/) -- Broadcast vs Postgres Changes, connection quotas, benchmarks
- [Supabase PostGIS Documentation](https://supabase.com/docs/guides/database/extensions/postgis) -- geospatial extension, spatial queries
- [Supabase Auth SSR for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) -- @supabase/ssr setup
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS patterns
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions/) -- Deno runtime, architecture
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) -- RN 0.81, React 19.1, New Architecture
- [Expo Location Docs](https://docs.expo.dev/versions/latest/sdk/location/) -- background location, permissions
- [Next.js 16 Blog](https://nextjs.org/blog/next-16) -- App Router, Turbopack
- [NativeWind Installation](https://www.nativewind.dev/docs/getting-started/installation) -- v4.1 stable, Tailwind v3 requirement

### Secondary (MEDIUM confidence)
- [BlaBlaCar reviews and competitor analysis](https://www.sunshineseeker.com/destinations/blablacar/) -- feature landscape, user complaints
- [BlaBlaCar Trustpilot](https://www.trustpilot.com/review/blablacar.com) -- user pain points (fees, cancellations, inflated ratings)
- [Callstack: Battery Optimization in React Native](https://www.callstack.com/blog/optimize-battery-drain-in-react-native-apps) -- adaptive tracking strategies
- [Carpooling Data Model (Red Gate)](https://www.red-gate.com/blog/creating-a-data-model-for-carpooling/) -- schema design patterns
- [Supabase cache helpers](https://supabase-cache-helpers.vercel.app/) -- TanStack Query integration

### Tertiary (LOW confidence)
- [PostGIS ride matching (Medium)](https://medium.com/@deepdeepak2222/how-to-implement-a-ride-matching-system-using-postgres-postgis-and-python-93cdcc5d0d55) -- route corridor matching with LINESTRING. Single source, needs validation.
- [HN: Why carpool apps fail](https://news.ycombinator.com/item?id=31329476) -- cold start dynamics. Anecdotal but consistent with industry knowledge.

---
*Research completed: 2026-02-15*
*Ready for roadmap: yes*
