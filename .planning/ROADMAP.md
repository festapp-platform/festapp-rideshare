# Roadmap: spolujizda.online

## Overview

spolujizda.online (formerly Festapp Rideshare) is built as a web-first PWA with a shared TypeScript monorepo, then extended to native mobile. The roadmap moves from foundation (monorepo + auth) through the core ride marketplace loop (post, search, book), then layers communication, trust, and differentiating features (live location, flexible rides, gamification). An AI & Voice phase adds natural language control and MCP server for external AI assistants. Web-specific optimizations (SEO, PWA) form their own phase since the launch strategy is web-first. The final phase covers internationalization, accessibility, and app store preparation. Testing (unit, integration, UI verification) is continuous — each phase includes tests for the features it delivers, with CI pipeline set up from Phase 1.

## Milestones

- ✅ **v1.0 MVP** - Phases 1-11 (shipped 2026-02-16)
- 🚧 **v1.1 UX Improvements & Bug Fixes** - Phases 12-16 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>✅ v1.0 MVP (Phases 1-11) - SHIPPED 2026-02-16</summary>

- [x] **Phase 1: Foundation & Auth** - Monorepo scaffolding, Supabase setup, authentication, app shell with navigation
- [x] **Phase 2: Profiles & Identity** - User profiles, vehicle info, verification badges, social links
- [x] **Phase 3: Ride Posting & Search** - Drivers post rides, passengers search and view ride details on a map
- [x] **Phase 4: Booking & Ride Management** - Seat booking (instant + request/approve), ride lifecycle, My Rides
- [x] **Phase 5: Communication & Notifications** - In-app chat, contact sharing, push and email notifications
- [x] **Phase 6: Ratings, Trust & Safety** - Mutual ratings/reviews, reporting, blocking, admin moderation panel
- [x] **Phase 7: Live Location** - Real-time driver location sharing for pickup coordination
- [x] **Phase 8: Events, Flexible Rides & Gamification** - Event pages with ride listings, route intents with subscriber alerts, impact dashboard, badges, levels
- [x] **Phase 9: AI & Voice** - In-app AI assistant, natural language ride operations, voice input, MCP server for external AI
- [x] **Phase 10: Web Platform & SEO** - PWA features, SSR for ride pages, social meta tags, web push, service worker
- [x] **Phase 11: Polish, Testing & Launch** - Test suite, i18n, accessibility, error monitoring, app store assets, launch prep

</details>

### 🚧 v1.1 UX Improvements & Bug Fixes

- [ ] **Phase 12: Critical Bug Fixes & Admin Setup** - Fix AI ride creation, chat duplicates, map picker, past time selection; configure admin accounts
- [ ] **Phase 13: Legal, Privacy & Observability** - ToS acceptance at signup, location sharing indicator, email/SMS/push logging, audit trail
- [ ] **Phase 14: Price Formatting, Chat Optimization & AI Tests** - Locale-aware price display, cash-friendly rounding, chat pagination/archival, AI integration tests
- [ ] **Phase 15: i18n Coverage** - Complete translation of all 171 remaining strings, interpolation support, cookie consent i18n, language settings
- [ ] **Phase 16: UI Polish & Route Features** - Map zoom, rating badges, simplified My Rides and notifications, waypoint management

## Phase Details

<details>
<summary>✅ v1.0 MVP Phase Details (Phases 1-11)</summary>

### Phase 1: Foundation & Auth
**Goal**: Users can sign up, log in, and navigate the app shell on both web and mobile
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, ONBR-01, ONBR-05, ONBR-06, ONBR-07, NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06, PLAT-01, PLAT-10, TEST-04, TEST-10
**Success Criteria** (what must be TRUE):
  1. User can sign up with phone number (SMS verification) and land on the home screen
  2. User can sign up and log in with email, Google, or Apple
  3. User session persists across app restarts and browser refresh without re-login
  4. User can log out and delete their account from the settings screen
  5. Bottom tab navigation (Search, My Rides, Messages, Profile) works on both web and mobile with the pastel design system applied
**Plans:** 5 plans

Plans:
- [x] 01-01-PLAN.md — Monorepo scaffolding (pnpm + Turborepo + shared package + CI)
- [x] 01-02-PLAN.md — Supabase schema, Edge Functions, and platform-specific clients
- [x] 01-03-PLAN.md — Authentication flows (phone OTP, email, Google, Apple) for web and mobile
- [x] 01-04-PLAN.md — App shell with tab navigation, pastel design system, settings (logout/delete)
- [x] 01-05-PLAN.md — Onboarding flow, splash/icon assets, and auth validation tests

### Phase 2: Profiles & Identity
**Goal**: Users have rich, trustworthy profiles that build confidence for ride sharing with strangers
**Depends on**: Phase 1
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-07, PROF-08, PROF-09, PROF-10, ONBR-02, ONBR-03, ONBR-04, PLAT-17
**Success Criteria** (what must be TRUE):
  1. User can create and edit a profile with display name, avatar photo, and bio
  2. Driver can add vehicle info (make, model, color, plate, photo) and it appears on their profile
  3. User profile shows verification badge for phone-verified users and enhanced badge for ID-uploaded users
  4. User can link Instagram and Facebook to their profile and view other users' profiles with social links, bio, and ratings placeholder
  5. Onboarding flow guides new users through profile creation and optional vehicle setup
**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md — Database foundation: vehicles table, storage buckets, profile columns, shared schemas
- [x] 02-02-PLAN.md — Profile editing with avatar upload (web + mobile)
- [x] 02-03-PLAN.md — Vehicle management with car photo upload (web + mobile)
- [x] 02-04-PLAN.md — Verification badges, social links, and public profile viewing
- [x] 02-05-PLAN.md — Extended onboarding: profile creation, role selection, vehicle setup

### Phase 3: Ride Posting & Search
**Goal**: Drivers can publish rides and passengers can find them by route and date with map-based results
**Depends on**: Phase 2
**Requirements**: RIDE-01, RIDE-02, RIDE-03, RIDE-04, RIDE-05, RIDE-07, RIDE-08, RIDE-09, RIDE-10, RIDE-11, RIDE-12, RIDE-13, SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, SRCH-07, SRCH-08, NAV-07
**Success Criteria** (what must be TRUE):
  1. Driver can post a ride with origin/destination (autocomplete), date/time, seats, and a price suggested by the app (adjustable)
  2. Passenger can search rides by origin, destination, and date and see geospatially matched results (rides passing near their route)
  3. Search results display driver profile, rating, vehicle info, price, seats, and departure time with filter/sort options
  4. Passenger can open a ride detail page showing route on map, driver profile, pickup points, co-passengers, and a booking action
  5. Rides can be shared via deep link, favorite routes can be saved, and the "Post a ride" button is accessible from any screen
**Plans:** 7 plans

Plans:
- [x] 03-01-PLAN.md — Database foundation: PostGIS, rides table, waypoints, recurring patterns, favorite routes, RLS, search RPC, expiry cron
- [x] 03-02-PLAN.md — Shared schemas, types, constants, and query builders for rides
- [x] 03-03-PLAN.md — Edge Function: compute-route proxy for Google Routes API + price suggestion
- [x] 03-04-PLAN.md — Ride posting form with Google Places autocomplete, route map, and price suggestion
- [x] 03-05-PLAN.md — Search results page with geospatial matching, ride cards, filtering and sorting
- [x] 03-06-PLAN.md — Ride detail page with SSR/OG metadata, ride editing, cancellation, and My Rides management
- [x] 03-07-PLAN.md — Post-a-Ride FAB, favorite routes, recurring ride patterns, deep link sharing

### Phase 4: Booking & Ride Management
**Goal**: Passengers can book seats and both parties can manage their upcoming and past rides
**Depends on**: Phase 3
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07, PROF-06
**Success Criteria** (what must be TRUE):
  1. Passenger can instantly book a seat (or multiple seats) on instant-booking rides
  2. Passenger can request a seat on request-and-approve rides and driver can accept or reject from their ride management view
  3. Driver and passenger can view upcoming and past rides on the My Rides screen
  4. Either party can cancel a booking with a reason, the other party is notified, and cancellations are tracked for driver reliability scoring
  5. Driver can mark a ride as completed, which updates ride status and prepares for the rating prompt
**Plans:** 5 plans

Plans:
- [x] 04-01-PLAN.md — Database foundation: bookings table, RPC functions, shared types/schemas/queries
- [x] 04-02-PLAN.md — Instant booking flow with seat selector and passenger list on ride detail
- [x] 04-03-PLAN.md — Request-and-approve booking flow with driver manage page
- [x] 04-04-PLAN.md — Cancellation handling with reason tracking and My Rides passenger view
- [x] 04-05-PLAN.md — Ride completion flow and driver reliability score badge

### Phase 5: Communication & Notifications
**Goal**: Drivers and passengers can coordinate via in-app chat and receive timely push/email notifications for all ride events
**Depends on**: Phase 4
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, NOTF-01, NOTF-02, NOTF-04, NOTF-05, NOTF-06, NOTF-07, NOTF-08, NOTF-09, SRCH-09
**Success Criteria** (what must be TRUE):
  1. Driver and passenger can chat 1:1 after booking, with typing indicators, read receipts, and message history accessible from ride history
  2. User can share their phone number with the other party after booking is confirmed
  3. User receives push notifications for booking requests, confirmations, cancellations, new messages, and ride reminders
  4. User receives email notifications for important events (booking confirmation, ride reminder, cancellation) respecting their preferences
  5. User can manage notification preferences (toggle categories on/off) from settings
**Plans:** 6 plans

Plans:
- [x] 05-01-PLAN.md — Database foundation: chat tables, notification preferences, RPCs, shared types/schemas/queries
- [x] 05-02-PLAN.md — Push notification infrastructure: send-notification Edge Function, OneSignal + SES helpers, web setup
- [x] 05-03-PLAN.md — Chat UI: conversation list, real-time chat, typing indicators, read receipts, contact sharing
- [x] 05-04-PLAN.md — Push notification triggers: booking/cancellation/message triggers via pg_net, ride reminders via pg_cron
- [x] 05-05-PLAN.md — Email notifications, notification preferences UI, OneSignal web initialization
- [x] 05-06-PLAN.md — Route alerts: alert toggle on saved routes, trigger on new ride match

### Phase 6: Ratings, Trust & Safety
**Goal**: Users can rate each other after rides, report bad behavior, and admins can moderate the platform
**Depends on**: Phase 4
**Requirements**: RATE-01, RATE-02, RATE-03, RATE-04, RATE-05, ADMN-01, ADMN-02, ADMN-03, ADMN-04
**Success Criteria** (what must be TRUE):
  1. After a completed ride, both driver and passenger can rate each other (1-5 stars) with an optional text review
  2. Ratings and reviews are visible on user profiles
  3. User can report another user for inappropriate behavior and block them (blocked user's rides and messages become invisible)
  4. Admin can view and manage reported users and content, warn/suspend/ban users, and see basic platform stats
  5. Admin panel is a protected web-only dashboard with role-based access
**Plans:** 5 plans

Plans:
- [x] 06-01-PLAN.md — Database foundation: reviews, reports, blocks, moderation tables, RPCs, triggers, cron jobs, RLS
- [x] 06-02-PLAN.md — Shared package: constants, Zod schemas, query builders, Database types for Phase 6
- [x] 06-03-PLAN.md — Rating modal, review display on profiles, experienced badge, pending rating detection
- [x] 06-04-PLAN.md — Report dialog, block/unblock, blocked users settings, profile integration
- [x] 06-05-PLAN.md — Admin panel: dashboard, reports management, user moderation, review management

### Phase 7: Live Location
**Goal**: Drivers and passengers can find each other at the pickup point using real-time location sharing on a map
**Depends on**: Phase 4
**Requirements**: LIVE-01, LIVE-02, LIVE-03, LIVE-04
**Success Criteria** (what must be TRUE):
  1. Driver can activate live location sharing when approaching the pickup point
  2. Passenger sees driver's real-time position on a map during pickup with smooth updates
  3. Location sharing uses adaptive GPS (battery-efficient with balanced accuracy and distance filtering)
  4. Location sharing automatically stops after pickup is confirmed or ride begins
**Plans:** 3 plans

Plans:
- [x] 07-01-PLAN.md — start_ride RPC, shared location constants/types, useLiveLocation Broadcast hook
- [x] 07-02-PLAN.md — LiveLocationMap component with animated driver marker, ride detail integration
- [x] 07-03-PLAN.md — Adaptive GPS frequency, auto-stop logic, unit and integration tests

### Phase 8: Events, Flexible Rides & Gamification
**Goal**: Users can create events with ride listings, drivers can post route intents that passengers subscribe to, and users are motivated by impact stats and achievement badges
**Depends on**: Phase 6 (needs admin approval for events)
**Requirements**: EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06, RIDE-06, FLEX-01, FLEX-02, FLEX-03, FLEX-04, NOTF-03, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, GAME-08
**Success Criteria** (what must be TRUE):
  1. User can create an event (name, location, date), admin approves it, and the event page shows all rides offered to that event
  2. Driver can post a ride linked to an event and it appears on both search results and the event page
  3. Driver can create a flexible ride (route intent without a specific date) and later confirm a date, notifying subscribers
  4. User can view their personal impact dashboard (CO2 saved, money saved, rides completed) and share it
  5. Users earn achievement badges and levels (New through Ambassador) displayed on their profile and in search results
**Plans:** 5 plans

Plans:
- [x] 08-01-PLAN.md — Events foundation: DB migration, admin approval RPCs, shared types/schemas/queries
- [x] 08-02-PLAN.md — Events UI: event creation/browsing/detail pages, admin management, ride form event linking
- [x] 08-03-PLAN.md — Flexible rides: route intents DB, subscriptions, route intent UI, date confirmation with subscriber notifications
- [x] 08-04-PLAN.md — Gamification: badges, levels, route streaks, nearby_rides extension, impact dashboard, profile/search integration
- [x] 08-05-PLAN.md — Community stats page, share component, event deep links, unit tests

### Phase 9: AI & Voice
**Goal**: Users can interact with the app via natural language (text or voice) for all core flows, and external AI assistants can operate the app via MCP tools
**Depends on**: Phase 8 (needs all core features to exist for AI to operate on)
**Requirements**: AIVC-01, AIVC-02, AIVC-03, AIVC-04, AIVC-05, AIVC-06, AIVC-07, AIVC-08, AIVC-09, AIVC-10
**Success Criteria** (what must be TRUE):
  1. User can open an AI assistant chat and create a ride by typing or speaking a natural language description (e.g., "Jedu zitra z Prahy do Brna ve 3, mam 3 mista")
  2. User can search for rides, book seats, and manage rides through the AI assistant with confirmation before each action
  3. Voice input works via speech-to-text on both mobile and web, feeding into the same AI processing pipeline
  4. AI assistant correctly handles Czech, Slovak, and English input
  5. MCP server exposes authenticated tools for ride posting, search, booking, and management that external AI assistants (Claude, ChatGPT) can use
**Plans:** 4 plans

Plans:
- [x] 09-01-PLAN.md — AI processing Edge Function (Gemini 2.5 Flash) for intent parsing + shared AI types
- [x] 09-02-PLAN.md — MCP server with authenticated ride operation tools
- [x] 09-03-PLAN.md — AI assistant chat UI with voice input and confirmation flow
- [x] 09-04-PLAN.md — Unit and integration tests for AI pipeline, MCP, and UI components

### Phase 10: Web Platform & SEO
**Goal**: The web app is a fully-featured PWA with SEO-optimized ride pages that drive organic traffic and convert visitors
**Depends on**: Phase 5
**Requirements**: WEB-01, WEB-02, WEB-03, WEB-04, WEB-05, WEB-06, WEB-07, WEB-08, WEB-09, PLAT-18
**Success Criteria** (what must be TRUE):
  1. Web app is installable as a PWA on mobile and desktop with offline support via service worker
  2. Web app has full feature parity with mobile for core flows (search, book, chat, profile)
  3. Ride pages are server-rendered, indexable by search engines, and have Open Graph meta tags for rich social previews
  4. Web app is fully responsive across mobile browsers, tablets, and desktop with short URL structure
  5. Web push notifications work via OneSignal and a smart web-to-app banner prompts mobile users to install the native app
**Plans:** 4 plans

Plans:
- [x] 10-01-PLAN.md — PWA manifest, service worker, offline support, and install prompt banner
- [x] 10-02-PLAN.md — Public ride/profile pages with short URLs, OG meta tags, robots.txt, and sitemap
- [x] 10-03-PLAN.md — Responsive design audit with tablet breakpoints, API rate limiting on Edge Functions
- [x] 10-04-PLAN.md — Unit tests for PWA/SEO/rate-limiting, web push finalization, feature parity check

### Phase 11: Polish, Testing & Launch
**Goal**: The app is production-ready with multi-language support, accessibility, error monitoring, and app store assets
**Depends on**: All previous phases
**Requirements**: PLAT-02, PLAT-03, PLAT-04, PLAT-05, PLAT-06, PLAT-07, PLAT-08, PLAT-09, PLAT-11, PLAT-12, PLAT-13, PLAT-14, PLAT-15, PLAT-16
**Success Criteria** (what must be TRUE):
  1. App supports Czech, Slovak, and English languages with correct translations
  2. App handles offline/poor connectivity gracefully, shows skeleton loading states, and has meaningful empty states and error pages
  3. Crash reporting (Sentry), anonymous analytics, GDPR compliance (data export, cookie consent), and force-update mechanism are operational
  4. Accessibility audit passes (screen reader labels, color contrast, touch targets)
  5. App store assets (screenshots, descriptions, metadata), terms of service, privacy policy, help/FAQ, donation prompt, and invite-friends flow are complete
**Plans:** 5 plans

Plans:
- [x] 11-01-PLAN.md — Internationalization (Czech, Slovak, English) with i18n provider and translations
- [x] 11-02-PLAN.md — Offline handling, skeleton loading states, empty states, and error pages
- [x] 11-03-PLAN.md — Crash reporting (Sentry), analytics, GDPR (cookie consent + data export), force-update
- [x] 11-04-PLAN.md — Accessibility audit: ARIA labels, skip navigation, focus indicators, color contrast, touch targets
- [x] 11-05-PLAN.md — Legal pages (ToS, privacy), help/FAQ, donation, invite friends, app store metadata

</details>

### Phase 12: Critical Bug Fixes & Admin Setup
**Goal**: Core features that are currently broken (AI ride creation, chat, map picker, time picker) work correctly, and admin accounts are operational
**Depends on**: Phase 11 (v1.0 complete)
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04, ADMIN-05, ADMIN-06
**Success Criteria** (what must be TRUE):
  1. User can type a natural language ride description (e.g., "z Ostravy do Brna zitra v 8") into the AI input and see origin, destination, date, time, and price pre-filled in the ride form
  2. Chat messages appear exactly once when sent -- no duplicates in the conversation view for either sender or recipient
  3. User can click a location on the map picker and the selected address appears immediately without the button getting stuck in a loading state
  4. Time picker only allows selecting dates and times in the future -- past options are disabled or filtered out
  5. bujnmi@gmail.com has admin access and can reach the admin panel
**Plans**: TBD

### Phase 13: Legal, Privacy & Observability
**Goal**: The platform meets legal requirements for user consent and privacy disclosure, and all outbound communications are logged for debugging and compliance
**Depends on**: Phase 12
**Requirements**: LEGAL-01, LEGAL-02, LEGAL-03, LOG-01, LOG-02, LOG-03, ADMIN-07
**Success Criteria** (what must be TRUE):
  1. User must check a Terms of Service and Privacy Policy checkbox before completing signup (both email and phone flows), and the acceptance timestamp is stored in user metadata
  2. When a driver shares their live location, a persistent banner is visible on all pages showing who can see the location and providing a stop button
  3. Every email, SMS, and push notification sent by the platform is logged with recipient, type, status, and timestamp in dedicated log tables
  4. All significant user and admin actions (ride CRUD, booking changes, moderation actions, profile changes) are recorded in an audit_log table
**Plans**: TBD

### Phase 14: Price Formatting, Chat Optimization & AI Tests
**Goal**: Prices display consistently in locale-aware format across the entire app, chat scales efficiently, and AI functionality has test coverage
**Depends on**: Phase 12 (bug fixes for AI must land first)
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-04, CHAT-05, CHAT-06, TEST-11, TEST-12
**Success Criteria** (what must be TRUE):
  1. All prices across the app display via a shared formatPrice() utility using Intl.NumberFormat with CZK currency (e.g., "150 Kc" in Czech locale, not "150 CZK" or "150,00 Kc")
  2. Suggested prices round to nearest 10 CZK (or 50 CZK for trips over 200 CZK) and the price value appears directly below the slider on the ride creation form
  3. Chat message history loads via cursor-based pagination and completed ride messages have an archival/cleanup strategy
  4. Integration tests verify the AI Edge Function handles ride creation intents in Czech, Slovak, and English, and gracefully handles ambiguous, incomplete, and invalid inputs
**Plans**: TBD

### Phase 15: i18n Coverage
**Goal**: Every user-facing string in the app is translated to Czech, Slovak, and English with working variable interpolation
**Depends on**: Phase 12 (i18n keys added incrementally as files are touched in earlier phases, but bulk completion here)
**Requirements**: I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, I18N-06
**Success Criteria** (what must be TRUE):
  1. The i18n t() function supports string interpolation for variables (e.g., t('rating.title', { name: 'Jan' }) renders "Rate your ride with Jan")
  2. All user-facing strings in core flow files (ride-detail, my-rides, booking-button, rating-modal, cancellation-dialog, public ride page, report-dialog, settings) use t() with translations in all three locales
  3. All user-facing strings in secondary and minor files (block-button, ride-card, login, signup, cookie-consent, force-update-banner, pwa-install-banner, offline-banner, share-button, pending-rating-banner, not-found, reset-password) use t() with translations in all three locales
  4. Cookie consent banner displays in the user's selected language instead of hardcoded English
  5. User can change the app language to Czech, Slovak, or English from a language settings page
**Plans**: TBD

### Phase 16: UI Polish & Route Features
**Goal**: Visual polish items are resolved and drivers can create rides with intermediate waypoints that passengers can search by
**Depends on**: Phase 12 (ride-form.tsx bug fixes must be complete before waypoint modifications)
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, ROUTE-01, ROUTE-02, ROUTE-03
**Success Criteria** (what must be TRUE):
  1. Map location picker opens zoomed to the already-selected coordinates instead of default Czech Republic view
  2. Users with no ratings show a "Novy" badge instead of 0 empty stars on ride cards and profiles
  3. "Money Saved" metric is hidden from the impact dashboard and community stats page
  4. My Rides page shows all rides in a single list (upcoming first, then past) without Upcoming/Past tab switcher, and notification settings are simplified to 2-3 grouped toggles
  5. Driver can add intermediate waypoints when creating a ride, waypoints are displayed on the route map, and passengers can search for rides where a waypoint is near their origin or destination
**Plans**: TBD

**Note on ride-form.tsx:** This file (930 lines) is modified by Phase 12 (BUG-01 AI fix, BUG-04 time picker), Phase 14 (PRICE-03 slider value display), and Phase 16 (ROUTE-01 waypoints). These phases must execute sequentially -- never plan parallel modifications to ride-form.tsx.

## Progress

**Execution Order:**
- v1.0: 1 -> 2 -> 3 -> 4 -> 5/6/7 (parallel-eligible) -> 8 (after 6) -> 9 -> 10 -> 11
- v1.1: 12 -> 13 -> 14 -> 15 -> 16

**Testing Strategy:** Each phase includes unit tests, integration tests, and UI verification as part of its plans. Testing is continuous, not deferred. i18n translations are added incrementally as files are touched per phase.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Auth | v1.0 | 5/5 | ✓ Complete | 2026-02-15 |
| 2. Profiles & Identity | v1.0 | 5/5 | ✓ Complete | 2026-02-15 |
| 3. Ride Posting & Search | v1.0 | 7/7 | ✓ Complete | 2026-02-15 |
| 4. Booking & Ride Management | v1.0 | 5/5 | ✓ Complete | 2026-02-15 |
| 5. Communication & Notifications | v1.0 | 6/6 | ✓ Complete | 2026-02-15 |
| 6. Ratings, Trust & Safety | v1.0 | 5/5 | ✓ Complete | 2026-02-15 |
| 7. Live Location | v1.0 | 3/3 | ✓ Complete | 2026-02-15 |
| 8. Events, Flexible Rides & Gamification | v1.0 | 5/5 | ✓ Complete | 2026-02-15 |
| 9. AI & Voice | v1.0 | 4/4 | ✓ Complete | 2026-02-16 |
| 10. Web Platform & SEO | v1.0 | 4/4 | ✓ Complete | 2026-02-16 |
| 11. Polish, Testing & Launch | v1.0 | 5/5 | ✓ Complete | 2026-02-16 |
| 12. Critical Bug Fixes & Admin Setup | v1.1 | 0/? | Not started | - |
| 13. Legal, Privacy & Observability | v1.1 | 0/? | Not started | - |
| 14. Price Formatting, Chat Optimization & AI Tests | v1.1 | 0/? | Not started | - |
| 15. i18n Coverage | v1.1 | 0/? | Not started | - |
| 16. UI Polish & Route Features | v1.1 | 0/? | Not started | - |

## Post-Launch: Deployment & Operations

**Completed:**
- [x] Migration squash: 38 migrations → 11 domain-grouped files
- [x] 83 integration tests passing (all RPCs, triggers, RLS)
- [x] Rebrand to spolujizda.online
- [x] AI assistant switched from Anthropic Claude to Google Gemini 2.5 Flash
- [x] All Supabase secrets configured (OneSignal, Mapy.cz, SMTP/SES, Google AI)
- [x] AWS IAM: dedicated `festapp-rideshare-sms` user for SNS (sns:Publish only)
- [x] Cloudflare Pages project created, OpenNext build working
- [x] Landing page (Czech), styled confirm dialogs, toast notifications

**Pending:**
- [ ] Domain setup: point `spolujizda.online` CNAME → `festapp-rideshare.pages.dev`
- [ ] First production deploy to Cloudflare Workers
- [ ] Push migrations to remote Supabase (`supabase db push`)
- [ ] Deploy Edge Functions (`supabase functions deploy`)
- [ ] GitHub Actions CI/CD: auto-deploy on push to main
- [ ] DNS propagation + SSL verification
