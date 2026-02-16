# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Drivers and passengers can find each other for shared rides quickly and effortlessly -- simpler, more trustworthy, and completely free.
**Current focus:** Milestone v1.1 -- UX Improvements & Bug Fixes (Phases 12-16)

## Current Position

Phase: 16 - UI Polish & Route Features (IN PROGRESS)
Plan: 03 of 4
Status: Executing Wave 1 (plans 01, 02, 03)
Last activity: 2026-02-17 -- Completed 16-03-PLAN.md (waypoint proximity search)

Progress: [████████████████████████████████████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: 5min
- Total execution time: 1.25 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-auth | 5/5 | 33min | 7min |
| 02-profiles-identity | 5/5 | 28min | 6min |

**Recent Trend:**
- Last 5 plans: 3min, 7min, 8min, 4min, 6min
- Trend: improving

*Updated after each plan completion*
| Phase 03 P01 | 3min | 2 tasks | 8 files |
| Phase 03 P02 | 2min | 2 tasks | 9 files |
| Phase 03 P04 | 7min | 2 tasks | 10 files |
| Phase 03 P05 | 4min | 2 tasks | 4 files |
| Phase 03 P06 | 4min | 2 tasks | 6 files |
| Phase 03 P07 | 4min | 2 tasks | 6 files |
| Phase 04 P01 | 3min | 2 tasks | 7 files |
| Phase 04 P02 | 5min | 2 tasks | 6 files |
| Phase 04 P03 | 6min | 2 tasks | 4 files |
| Phase 04 P04 | 5min | 2 tasks | 3 files |
| Phase 04 P05 | 4min | 2 tasks | 4 files |
| Phase 05 P01 | 3min | 2 tasks | 9 files |
| Phase 05 P02 | 3min | 2 tasks | 8 files |
| Phase 05 P04 | 2min | 2 tasks | 3 files |
| Phase 05 P03 | 5min | 2 tasks | 11 files |
| Phase 05 P05 | 3min | 2 tasks | 6 files |
| Phase 05 P05 | 2min | 2 tasks | 3 files |
| Phase 05 P06 | 2min | 2 tasks | 3 files |
| Phase 06 P01 | 3min | 2 tasks | 3 files |
| Phase 06 P02 | 3min | 2 tasks | 7 files |
| Phase 06 P03 | 5min | 2 tasks | 12 files |
| Phase 06 P04 | 4min | 2 tasks | 5 files |
| Phase 06 P05 | 7min | 2 tasks | 14 files |
| Phase 07 P01 | 1min | 2 tasks | 5 files |
| Phase 07 P02 | 2min | 2 tasks | 2 files |
| Phase 07 P03 | 8min | 2 tasks | 8 files |
| Phase 08 P01 | 3min | 2 tasks | 6 files |
| Phase 08 P04 | 6min | 2 tasks | 12 files |
| Phase 08 P03 | 6min | 2 tasks | 16 files |
| Phase 08 P02 | 6min | 2 tasks | 11 files |
| Phase 08 P05 | 4min | 2 tasks | 11 files |
| Phase 09 P01 | 3min | 2 tasks | 5 files |
| Phase 09 P02 | 3min | 2 tasks | 5 files |
| Phase 09 P03 | 5min | 2 tasks | 7 files |
| Phase 09 P04 | 7min | 2 tasks | 7 files |
| Phase 10 P03 | 5min | 2 tasks | 9 files |
| Phase 10 P01 | 3min | 2 tasks | 7 files |
| Phase 10 P02 | 3min | 2 tasks | 13 files |
| Phase 10 P01 | 3min | 2 tasks | 8 files |
| Phase 10 P04 | 4min | 2 tasks | 5 files |
| Phase 11 P01 | 4min | 2 tasks | 9 files |
| Phase 11 P02 | 3min | 2 tasks | 8 files |
| Phase 11 P04 | 4min | 2 tasks | 6 files |
| Phase 12 P02 | 2min | 2 tasks | 1 files |
| Phase 12 P03 | 2min | 2 tasks | 1 files |
| Phase 12 P01 | 3min | 2 tasks | 4 files |
| Phase 13 P03 | 5min | 2 tasks | 5 files |
| Phase 13 P01 | 3min | 2 tasks | 3 files |
| Phase 13 P02 | 6min | 2 tasks | 5 files |
| Phase 14 P01 | 3min | 2 tasks | 4 files |
| Phase 14 P04 | 2min | 1 tasks | 1 files |
| Phase 14 P03 | 3min | 2 tasks | 2 files |
| Phase 14 P02 | 4min | 2 tasks | 17 files |
| Phase 15 P01 | 7min | 2 tasks | 8 files |
| Phase 15 P02 | 5min | 2 tasks | 8 files |
| Phase 15 P03 | 6min | 2 tasks | 10 files |
| Phase 16 P03 | 1min | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Web + PWA first launch strategy; native app store releases in later phase
- [Roadmap]: Supabase Realtime Broadcast for ephemeral data (location, typing) from day one per research
- [v1.1 Roadmap]: ride-form.tsx (930 lines) touched by 3 features -- must be modified sequentially across phases 12, 14, 16
- [v1.1 Roadmap]: Route alternatives OUT OF SCOPE (mutually exclusive with waypoints in Google Routes API)
- [v1.1 Roadmap]: i18n incremental -- add translations as files are touched per phase, bulk completion in Phase 15
- [v1.1 Roadmap]: UX-03/UX-04 overlap with PRICE-03 -- price slider display grouped in Phase 14 (PRICE-03) and Phase 16 (UX-04)
- [v1.1 Roadmap]: Chat dedup fix uses client UUID passed to server RPC (not timestamp-based dedup)
- [v1.1 Roadmap]: AI fix needs geocoding bridge (Mapy.cz forward geocode) + shouldUnregister:false in wizard form
- [14-01]: COST_SHARING_FACTOR 0.327 yields ~0.80 CZK/km; roundPrice inlined in Edge Function (Deno can't import shared)
- [13-03]: rawGpsStop/stopSharing split avoids circular calls between banner and hook
- [13-03]: try/catch for optional useLocationSharing at hook top level for test compatibility
- [01-01]: Used Zod v3.25 (not v4.3) -- stable API, v4 was speculative
- [01-01]: expo-router v6 for SDK 54 (not v5 from plan); corrected all Expo package versions
- [01-01]: Tailwind v4 for web, v3 for mobile (NativeWind constraint confirmed)
- [01-02]: Enabled SMS signup with test OTP for local dev; production uses Send SMS Hook via AWS SNS
- [01-02]: Used getUser() in middleware (not getClaims()) -- proven pattern per research
- [01-02]: Added .env.local.example exception to web .gitignore
- [01-03]: Used Supabase OAuth redirect for web social auth instead of dedicated SDK components
- [01-03]: Mobile social auth buttons with TODO for native SDK config; signInWithIdToken API is correct
- [01-03]: Auth gate uses getUser() for initial validation, getSession() only after user confirmed valid
- [01-04]: Used inline style props with design tokens for mobile (not only NativeWind classes) for exact palette colors
- [01-04]: Web nav split: server component layout (auth check) + client component app-nav.tsx (active state)
- [01-04]: ColorTokens type uses {[K]: string} instead of literal types for light/dark union compatibility
- [01-05]: Web onboarding skips location permission -- browser prompts contextually when needed
- [01-05]: Onboarding completion stored client-side (AsyncStorage/localStorage) -- no server round-trip
- [01-05]: Web app layout detects onboarding path via header check for nav-free rendering
- [02-01]: DisplayNameSchema moved from auth.ts to profile.ts as single source of truth; re-exported from auth.ts
- [02-01]: is_phone_verified derives from auth.users (no duplicated column) per research pitfall #4
- [02-01]: Storage path helpers use Date.now() suffix for CDN cache-busting
- [02-02]: Web avatar upload uses browser-image-compression with useWebWorker for non-blocking compression
- [02-02]: Mobile uses Controller pattern from react-hook-form for TextInput (not register) for proper RN integration
- [02-02]: Avatar upload on web previews locally, uploads on save; mobile uploads immediately on pick
- [02-03]: Mobile photo upload offered after save (vehicle ID needed for storage path); web uploads inline
- [02-03]: Web inline confirm-on-second-click for delete; mobile uses native Alert dialog
- [02-04]: ID documents stored in avatars bucket under userId/id-document path -- private bucket in polish phase
- [02-04]: ID upload auto-verifies (id_verified=true) -- production requires admin review
- [02-04]: Public profile fetches phone verification via is_phone_verified RPC in parallel with profile data
- [02-05]: Separate PROFILE_ONBOARDING_COMPLETED_KEY for backward compat -- existing users keep their completed state but see new profile steps
- [02-05]: Mobile vehicle photo upload offered via Alert after save (consistent with 02-03 pattern)
- [02-05]: FlatList Option A: scrollEnabled disabled for form steps, re-enabled for passive steps
- [03-03]: Added coordinate range validation and 502 status for upstream Google API errors
- [03-03]: CORS headers on all Edge Function responses including errors for web client compatibility
- [Phase 03]: PostGIS functions use extensions. prefix throughout (ST_DWithin, ST_Distance, ST_MakePoint, ST_SetSRID) per Supabase requirement
- [Phase 03]: pg_cron extension enabled explicitly in migration (not pre-installed on Supabase hosted)
- [Phase 03]: nearby_rides RPC falls back to point matching when route_geometry is NULL
- [Phase 03-02]: Added @supabase/supabase-js to shared package for typed query builders (SupabaseClient<Database> pattern)
- [Phase 03-02]: PostGIS geography columns typed as unknown (opaque binary format); NearbyRideResult derived from Database Functions type
- [03-04]: GoogleMapsProvider wraps entire app layout for consistent Maps/Places availability
- [03-04]: AddressAutocomplete backward-compat with onSelect/label props for existing search-form consumers
- [03-04]: PostGIS geography columns inserted via WKT text strings (POINT, LINESTRING) -- no RPC needed
- [03-04]: AdvancedMarkerElement used for map pins (future-proof vs legacy Marker)
- [03-05]: Client-side filtering on RPC results for price/mode/seats refinement; RPC handles spatial filtering
- [03-05]: URL search params persist coordinates and date for shareable/bookmarkable searches
- [03-05]: Skeleton cards as loading state instead of spinner for better perceived performance
- [03-06]: PostGIS geography parsed via WKT regex with GeoJSON fallback for coordinate extraction
- [03-06]: EditRideForm only recomputes route when origin/destination actually changes (routeChanged flag)
- [03-06]: My Rides fetches all driver rides at once and filters client-side into upcoming/past tabs
- [03-07]: FAB positioned bottom-20 on mobile (above bottom nav) and bottom-8 on desktop
- [03-07]: Favorite routes match by address string (not coordinates) for deduplication simplicity
- [03-07]: Skipped Share button on ride-detail.tsx since 03-06 runs in parallel
- [03-07]: Recurring ride form uses local state (not react-hook-form) for simpler one-off page
- [04-01]: All booking mutations via SECURITY DEFINER RPCs -- no direct INSERT/UPDATE/DELETE RLS policies
- [04-01]: expire_past_rides collects expired ride IDs into array first, then batch-updates bookings
- [04-02]: Installed sonner for toast notifications (no existing toast library); Toaster in app layout
- [04-02]: PostgREST FK hint !bookings_passenger_id_fkey for profiles disambiguation (passenger_id vs cancelled_by)
- [04-03]: ManageRideContent as separate client component for clean server/client split
- [04-03]: Manage Bookings link shown when booking_mode is 'request' OR any pending bookings exist
- [04-04]: CancellationDialog handles both booking and ride cancellation via type prop -- single reusable component
- [04-04]: Removed direct updateRide cancel in favor of cancel_ride RPC for proper cascading and reason tracking
- [04-05]: Reliability data fetched server-side on ride detail page to avoid client-side waterfall
- [04-05]: Cancellation rate color coding: green <= 10%, amber 10-20%, red > 20%
- [04-05]: Two-step confirm pattern for ride completion (consistent with cancel flow)
- [04-05]: Manage page redirects to ride detail after completion (manage actions no longer relevant)
- [05-01]: Lazy conversation creation with ON CONFLICT for race-safe deduplication
- [05-01]: get_unread_count as SQL function (STABLE) for optimal nav badge performance
- [05-01]: ChatMessage Zod type aliased as ChatMessageValidated in index to avoid collision with Database derived type
- [05-02]: Service_role Bearer token auth for send-notification (server-to-server only, not user-facing)
- [05-02]: SES client lazily instantiated and cached at module level (singleton per invocation)
- [05-02]: Null notification preferences treated as all-enabled for graceful first-use (Pitfall 7)
- [05-04]: _notify() helper function extracts pg_net HTTP POST pattern for reuse across triggers
- [05-04]: 75-minute reminder window to handle 15-min cron intervals without missing rides
- [05-04]: reminder_sent_at column on rides table (simpler than separate tracking table)
- [Phase 05]: Optimistic message sending with client-side UUID and dedup on Realtime delivery (Pitfall 6)
- [Phase 05]: UnreadBadge subscribes globally to chat_messages INSERT/UPDATE for real-time count
- [Phase 05]: ContactShareButton integrated into ChatView action bar for onSendMessage callback access
- [05-05]: Email templates use inline HTML/CSS with table layout for email client compatibility (no template engine)
- [05-05]: send-ride-reminders calls send-notification via HTTP for unified push+email+preferences dispatch
- [05-05]: OneSignalInit uses dynamic import() to avoid SSR issues with OneSignal browser SDK
- [05-06]: Dedicated RPC (find_matching_route_alerts) for geospatial matching instead of raw SQL in Edge Function
- [05-06]: check-route-alerts calls sendPush directly via onesignal.ts -- avoids extra HTTP hop through send-notification
- [06-01]: Dual-reveal uses FOR UPDATE on counter-review query to prevent race conditions
- [06-01]: Block-aware RPCs use CREATE OR REPLACE to augment existing functions with NOT EXISTS block checks
- [06-01]: Reports RLS uses inline JWT check to avoid forward dependency on is_admin() in migration 031
- [06-01]: Rating aggregation trigger fires on INSERT and UPDATE OF revealed_at for immediate recalculation
- [06-02]: No index.ts barrel files in subdirectories -- project uses flat exports from src/index.ts
- [06-03]: StarRating component with sm/md variants replaces all inline star rendering; "New" label for unrated users
- [06-03]: justCompleted query param triggers rating modal on ride detail page; server-side review eligibility check
- [06-03]: PendingRatingBanner uses sessionStorage for session-scoped dismiss (not persistent localStorage)
- [06-04]: Three-dot ellipsis menu for Report/Block actions on profile page (not inline buttons)
- [06-04]: Block confirmation required, unblock instant; optimistic UI with error revert
- [06-04]: Banned profiles show "account suspended" to visitors; suspended users see banner on own profile only
- [06-05]: Admin panel standalone layout (not inside (app) group) with gray-50 background and indigo accent
- [06-05]: TrendChart uses next/dynamic with ssr:false for recharts lazy-loading
- [06-05]: ModerationActionForm two-click confirm pattern for destructive admin actions
- [06-05]: Installed lucide-react for admin panel icons (LayoutDashboard, Flag, Users, Star)
- [07-01]: start_ride follows complete_ride pattern: SECURITY DEFINER, FOR UPDATE row lock, validated driver ownership
- [07-01]: Broadcast-only location sharing (no database persistence) for ephemeral driver positions
- [07-02]: LiveLocationMap replaces RouteMap during active sharing (conditional swap, not side-by-side)
- [07-02]: Passenger auto-subscribes to Broadcast when ride is in_progress and booking is confirmed
- [07-03]: React 19 requires async act() for test rendering; synchronous act() produces empty containers
- [07-03]: happy-dom vitest environment for React 19 compatibility (same async requirement as jsdom, faster)
- [07-03]: LiveLocationMap tests use inline JSX due to pnpm dual-React issue with component imports
- [07-03]: Postgres Changes subscription for cross-device auto-stop on ride completion/cancellation
- [08-01]: get_event_rides returns empty set (not error) for non-approved events for graceful client handling
- [08-01]: Event deletion restricted to own pending events only; approved/rejected events persist for history
- [08-01]: rides.event_id uses ON DELETE SET NULL so rides survive if event removed
- [08-04]: Route streaks use ISO week string comparison for consecutive week detection
- [08-04]: LevelBadge hides "New" level on ride cards (default, not informative)
- [08-04]: Impact CO2 uses EU average 120g CO2/km saved per shared ride
- [08-04]: Badges always publicly visible via RLS SELECT for everyone (social proof)
- [Phase 08]: flexible_ride_confirmed notification type maps to push_route_alerts preference (no new DB column)
- [08-02]: PostgREST FK hint profiles!events_creator_id_fkey needed for events table (two FKs to profiles)
- [08-02]: Admin event detail uses two-click confirm pattern consistent with moderation actions
- [08-02]: Ride form fetches approved events client-side for optional linking dropdown
- [08-05]: Community and My Impact added as secondary sidebar items (not bottom tab bar) to keep mobile nav clean
- [08-05]: ShareButton uses navigator.share first, clipboard fallback second for cross-platform sharing
- [08-05]: Community stats RPC uses SECURITY DEFINER + GRANT to anon for public access without auth
- [09-01]: Anthropic SDK v0.52.0 via esm.sh for Deno Edge Function compatibility
- [09-01]: Inline request validation in Edge Function (shared package not importable from Deno)
- [09-01]: Language detection via diacritics/word heuristic (not separate API call)
- [09-01]: Mutations always need_confirmation=true; search and general_chat do not
- [09-01]: System prompt uses {today} placeholder injected at runtime for relative date resolution
- [09-02]: Used McpServer high-level API instead of deprecated Server class for cleaner tool registration
- [09-02]: search_rides geocodes via compute-route Edge Function with text-based ilike fallback
- [09-02]: Auth helper reads SUPABASE_USER_JWT env var for RLS-scoped access; falls back to service_role
- [Phase 09]: Web Speech API types via any cast (SpeechRecognition not in default TS DOM lib)
- [Phase 09]: Server actions proxy AI Edge Function calls (keeps key server-side)
- [Phase 09]: Voice transcript auto-submits to sendMessage for faster UX
- [09-04]: Inline JSX test pattern (no hooks) for VoiceInput/IntentConfirmation due to pnpm dual-React issue with useState
- [09-04]: Mock McpServer captures registerTool calls to verify tool definitions without real MCP transport
- [09-04]: Extended web vitest include to app/**/__tests__/ for component-colocated tests
- [10-03]: Sidebar w-16 on tablet (icons only), w-64 on desktop (with labels) via lg: breakpoint
- [10-03]: Rate limiting fails open on DB errors to avoid blocking legitimate requests
- [10-03]: Rate limit identifier: x-forwarded-for > auth header hash > "anonymous"
- [10-01]: SW uses cache-first for statics, network-first for navigation, network-only for API/Supabase
- [10-01]: SW explicitly excludes OneSignal URLs to avoid interference with push notification worker
- [10-01]: Install banner dismissal persisted to localStorage; standalone mode check prevents re-showing
- [10-02]: Short IDs use 6-char unambiguous charset (abcdefghjkmnpqrstuvwxyz23456789) generated by PostgreSQL trigger
- [10-02]: Public route group (public) has minimal header + CTA footer, no auth check
- [10-02]: Canonical URLs on authenticated ride pages point to public short URLs for SEO consolidation
- [10-02]: Default OG image placeholder used; future OG image API endpoint can replace it
- [11-01]: Lightweight React context i18n (no framework) -- finite UI string set makes context sufficient
- [11-01]: Flat dot-notation translation keys (nav.search, settings.language) for simplicity
- [11-01]: localStorage persistence with DEFAULT_LOCALE=cs fallback for new users
- [11-02]: OfflineBanner placed outside main flex container for fixed overlay positioning
- [11-02]: ErrorBoundary as class component (React requirement for getDerivedStateFromError)
- [11-02]: Inline JSX test pattern reused for UI state component tests (pnpm dual-React workaround)
- [Phase 12]: AI fix uses forwardGeocode bridge (Mapy.cz /v1/geocode) at module level with parallel Promise.all for origin+destination
- [Phase 12]: shouldUnregister:false on wizard useForm to preserve AI-set values across step navigation
- [Phase 12]: try/finally for reverseGeocode loading flag; fresh Date() for time filtering; COALESCE for backward-compat UUID dedup
- [13-01]: Used public.is_admin() for audit RLS policy (consistent with safety migration pattern)
- [13-01]: Auth email logging uses user?.id ?? null since user_id is now nullable for signup confirmations
- [13-01]: Best-effort logging in auth hooks: never block auth flow for observability
- [Phase 13-02]: Single acceptedTerms state above tab switcher gates all signup methods (not per-form Zod); social OAuth consent proven by UI checkbox flow
- [Phase 14-04]: Vitest 4 requires it(name, {timeout}, fn) instead of deprecated it(name, fn, {timeout})
- [Phase 14-03]: No duplicate index: existing idx_chat_messages_conversation covers pagination and archival
- [Phase 14]: [14-02]: Form labels kept as plain text CZK
- [15-01]: t() interpolation uses regex {var} replace with global flag; preference labels moved inside component render for locale reactivity (input currency label, not price display); formatPrice() is single source for all user-facing price strings
- [15-02]: ride-status-badge converted to client component for useI18n; public ride page split into server (metadata) + PublicRideContent client sub-component for translated UI; SEO metadata stays English server-side
- [15-03]: not-found.tsx converted to client component for useI18n (no server data needs); brand names (Google, Apple) kept untranslated in social login buttons
- [16-03]: EXISTS subquery (not JOIN) for waypoint proximity to avoid row multiplication; extensions. prefix on all PostGIS functions

### Pending Todos

- [ ] Landing page: initial page explaining what the app is about, with anonymised rides visible to non-authenticated users
- [ ] SMTP: configure same SMTP as akhweb project (waiting for credentials from user)
- [ ] Prettier dialogs: delete account confirmation and other modals (polish phase)
- [ ] Supabase project linked: `xamctptqmpruhovhjcgm` (rideshare) on rawen.dev 2, migrations pushed
- [x] Fix image uploads via Edge Function: refactor to server-side upload (like akhweb), random UUID filenames, bypass broken RLS (api) -- IN PROGRESS
- [x] Research and implement ride audit trail: event sourcing/CDC/trigger research + ride_events table + RPC updates + cancellation columns (database) -- IN PROGRESS

### Blockers/Concerns

- [Research]: Expo SDK 54 + Next.js 16 + Turborepo combination has limited community examples; may encounter tooling issues in Phase 1 -- RESOLVED in 01-01: combination works, both apps build and start
- [Research]: NativeWind v4.1 requires Tailwind CSS v3 (web can use v4 independently); version alignment needed -- RESOLVED in 01-01: Tailwind v4 web / v3 mobile confirmed working

## Session Continuity

Last session: 2026-02-17
Stopped at: Completed 16-03-PLAN.md (waypoint proximity search)
Resume file: N/A
