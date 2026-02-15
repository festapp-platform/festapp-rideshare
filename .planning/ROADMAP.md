# Roadmap: Festapp Rideshare

## Overview

Festapp Rideshare is built as a web-first PWA with a shared TypeScript monorepo, then extended to native mobile. The roadmap moves from foundation (monorepo + auth) through the core ride marketplace loop (post, search, book), then layers communication, trust, and differentiating features (live location, flexible rides, gamification). Web-specific optimizations (SEO, PWA) form their own phase since the launch strategy is web-first. The final phase covers testing infrastructure, internationalization, and app store preparation for the native release.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Auth** - Monorepo scaffolding, Supabase setup, authentication, app shell with navigation
- [ ] **Phase 2: Profiles & Identity** - User profiles, vehicle info, verification badges, social links
- [ ] **Phase 3: Ride Posting & Search** - Drivers post rides, passengers search and view ride details on a map
- [ ] **Phase 4: Booking & Ride Management** - Seat booking (instant + request/approve), ride lifecycle, My Rides
- [ ] **Phase 5: Communication & Notifications** - In-app chat, contact sharing, push and email notifications
- [ ] **Phase 6: Ratings, Trust & Safety** - Mutual ratings/reviews, reporting, blocking, admin moderation panel
- [ ] **Phase 7: Live Location** - Real-time driver location sharing for pickup coordination
- [ ] **Phase 8: Flexible Rides & Gamification** - Route intents with subscriber alerts, impact dashboard, badges, levels
- [ ] **Phase 9: Web Platform & SEO** - PWA features, SSR for ride pages, social meta tags, web push, service worker
- [ ] **Phase 10: Polish, Testing & Launch** - Test suite, i18n, accessibility, error monitoring, app store assets, launch prep

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: Users can sign up, log in, and navigate the app shell on both web and mobile
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, ONBR-01, ONBR-05, ONBR-06, ONBR-07, NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06, PLAT-01, PLAT-10
**Success Criteria** (what must be TRUE):
  1. User can sign up with phone number (SMS verification) and land on the home screen
  2. User can sign up and log in with email, Google, or Apple
  3. User session persists across app restarts and browser refresh without re-login
  4. User can log out and delete their account from the settings screen
  5. Bottom tab navigation (Search, My Rides, Messages, Profile) works on both web and mobile with the pastel design system applied
**Plans**: TBD

Plans:
- [ ] 01-01: Monorepo scaffolding and shared package
- [ ] 01-02: Supabase project setup and database schema
- [ ] 01-03: Authentication flows (phone, email, social)
- [ ] 01-04: App shell, navigation, and design system
- [ ] 01-05: Onboarding flow skeleton

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
**Plans**: TBD

Plans:
- [ ] 02-01: Profile creation and editing (name, avatar, bio)
- [ ] 02-02: Vehicle info and car photo management
- [ ] 02-03: Verification badges and social profile linking
- [ ] 02-04: Profile viewing and onboarding completion
- [ ] 02-05: Image optimization pipeline (compression, thumbnails)

### Phase 3: Ride Posting & Search
**Goal**: Drivers can publish rides and passengers can find them by route and date with map-based results
**Depends on**: Phase 2
**Requirements**: RIDE-01, RIDE-02, RIDE-03, RIDE-04, RIDE-05, RIDE-07, RIDE-08, RIDE-09, RIDE-10, RIDE-11, RIDE-12, SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, SRCH-07, SRCH-08, NAV-07
**Success Criteria** (what must be TRUE):
  1. Driver can post a ride with origin/destination (autocomplete), date/time, seats, and a price suggested by the app (adjustable)
  2. Passenger can search rides by origin, destination, and date and see geospatially matched results (rides passing near their route)
  3. Search results display driver profile, rating, vehicle info, price, seats, and departure time with filter/sort options
  4. Passenger can open a ride detail page showing route on map, driver profile, pickup points, co-passengers, and a booking action
  5. Rides can be shared via deep link, favorite routes can be saved, and the "Post a ride" button is accessible from any screen
**Plans**: TBD

Plans:
- [ ] 03-01: Ride posting form with address autocomplete and price suggestion
- [ ] 03-02: PostGIS geospatial search and ride matching
- [ ] 03-03: Search results UI with filtering and sorting
- [ ] 03-04: Ride detail page with map, driver info, and pickup points
- [ ] 03-05: Ride management (edit, delete, expiry, status flow)
- [ ] 03-06: Deep links, favorite routes, and post-ride FAB

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
**Plans**: TBD

Plans:
- [ ] 04-01: Instant booking flow
- [ ] 04-02: Request-and-approve booking flow
- [ ] 04-03: My Rides screen (upcoming + history)
- [ ] 04-04: Cancellation handling and reliability scoring
- [ ] 04-05: Ride completion flow and passenger management

### Phase 5: Communication & Notifications
**Goal**: Drivers and passengers can coordinate via in-app chat and receive timely push/email notifications for all ride events
**Depends on**: Phase 4
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, NOTF-01, NOTF-02, NOTF-04, NOTF-05, NOTF-06, NOTF-07, NOTF-08, NOTF-09
**Success Criteria** (what must be TRUE):
  1. Driver and passenger can chat 1:1 after booking, with typing indicators, read receipts, and message history accessible from ride history
  2. User can share their phone number with the other party after booking is confirmed
  3. User receives push notifications for booking requests, confirmations, cancellations, new messages, and ride reminders
  4. User receives email notifications for important events (booking confirmation, ride reminder, cancellation) respecting their preferences
  5. User can manage notification preferences (toggle categories on/off) from settings
**Plans**: TBD

Plans:
- [ ] 05-01: Real-time chat with Supabase Broadcast
- [ ] 05-02: Chat UI (typing indicators, read receipts, message history)
- [ ] 05-03: Contact sharing after booking
- [ ] 05-04: Push notification infrastructure (OneSignal)
- [ ] 05-05: Push notification triggers for all ride events
- [ ] 05-06: Email notifications and preference management

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
**Plans**: TBD

Plans:
- [ ] 06-01: Rating and review submission flow
- [ ] 06-02: Rating display on profiles and aggregation
- [ ] 06-03: User reporting and blocking
- [ ] 06-04: Admin panel with moderation tools
- [ ] 06-05: Platform stats dashboard

### Phase 7: Live Location
**Goal**: Drivers and passengers can find each other at the pickup point using real-time location sharing on a map
**Depends on**: Phase 4
**Requirements**: LIVE-01, LIVE-02, LIVE-03, LIVE-04
**Success Criteria** (what must be TRUE):
  1. Driver can activate live location sharing when approaching the pickup point
  2. Passenger sees driver's real-time position on a map during pickup with smooth updates
  3. Location sharing uses adaptive GPS (battery-efficient with balanced accuracy and distance filtering)
  4. Location sharing automatically stops after pickup is confirmed or ride begins
**Plans**: TBD

Plans:
- [ ] 07-01: Location sharing activation and Supabase Broadcast channel
- [ ] 07-02: Live map UI with real-time driver position
- [ ] 07-03: Adaptive GPS and battery optimization
- [ ] 07-04: Auto-stop logic and pickup confirmation

### Phase 8: Flexible Rides & Gamification
**Goal**: Drivers can post route intents that passengers subscribe to, and users are motivated by impact stats and achievement badges
**Depends on**: Phase 4
**Requirements**: RIDE-06, FLEX-01, FLEX-02, FLEX-03, FLEX-04, NOTF-03, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, GAME-08
**Success Criteria** (what must be TRUE):
  1. Driver can create a flexible ride (route intent without a specific date) and later confirm a date
  2. Passenger can subscribe to a route intent and receives a push notification when the driver confirms a date
  3. Subscribers can book a seat on the confirmed ride through the normal booking flow
  4. User can view their personal impact dashboard (CO2 saved, money saved, rides completed) and share it
  5. Users earn achievement badges and levels (New through Ambassador) displayed on their profile and in search results
**Plans**: TBD

Plans:
- [ ] 08-01: Flexible ride creation and route intent UI
- [ ] 08-02: Subscription system and notification triggers
- [ ] 08-03: Flexible ride confirmation and booking bridge
- [ ] 08-04: Impact dashboard and stats calculation
- [ ] 08-05: Achievement badges, levels, and route streaks
- [ ] 08-06: Community stats page and social sharing

### Phase 9: Web Platform & SEO
**Goal**: The web app is a fully-featured PWA with SEO-optimized ride pages that drive organic traffic and convert visitors
**Depends on**: Phase 5
**Requirements**: WEB-01, WEB-02, WEB-03, WEB-04, WEB-05, WEB-06, WEB-07, WEB-08, WEB-09, PLAT-18
**Success Criteria** (what must be TRUE):
  1. Web app is installable as a PWA on mobile and desktop with offline support via service worker
  2. Web app has full feature parity with mobile for core flows (search, book, chat, profile)
  3. Ride pages are server-rendered, indexable by search engines, and have Open Graph meta tags for rich social previews
  4. Web app is fully responsive across mobile browsers, tablets, and desktop with short URL structure
  5. Web push notifications work via OneSignal and a smart web-to-app banner prompts mobile users to install the native app
**Plans**: TBD

Plans:
- [ ] 09-01: PWA manifest, service worker, and offline support
- [ ] 09-02: SSR/SSG for ride pages and SEO optimization
- [ ] 09-03: Open Graph meta tags and social preview cards
- [ ] 09-04: Responsive design audit and short URL routing
- [ ] 09-05: Web push notifications and web-to-app banner
- [ ] 09-06: API rate limiting on public endpoints

### Phase 10: Polish, Testing & Launch
**Goal**: The app is production-ready with a full test suite, multi-language support, accessibility, error monitoring, and app store assets
**Depends on**: All previous phases
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09, TEST-10, PLAT-02, PLAT-03, PLAT-04, PLAT-05, PLAT-06, PLAT-07, PLAT-08, PLAT-09, PLAT-11, PLAT-12, PLAT-13, PLAT-14, PLAT-15, PLAT-16
**Success Criteria** (what must be TRUE):
  1. Unit, integration, and E2E tests cover all critical flows and CI pipeline runs them on every PR
  2. App supports Czech, Slovak, and English languages with correct translations
  3. App handles offline/poor connectivity gracefully, shows skeleton loading states, and has meaningful empty states and error pages
  4. Crash reporting (Sentry), anonymous analytics, GDPR compliance (data export, cookie consent), and force-update mechanism are operational
  5. App store assets (screenshots, descriptions, metadata), terms of service, privacy policy, help/FAQ, donation prompt, and invite-friends flow are complete
**Plans**: TBD

Plans:
- [ ] 10-01: Shared package and Edge Function unit tests
- [ ] 10-02: Integration tests (auth, booking, core flows, RLS)
- [ ] 10-03: UI component tests and E2E tests (web + mobile)
- [ ] 10-04: CI pipeline setup
- [ ] 10-05: Internationalization (Czech, Slovak, English)
- [ ] 10-06: Offline handling, loading states, and error pages
- [ ] 10-07: Crash reporting, analytics, and GDPR compliance
- [ ] 10-08: Accessibility audit and polish
- [ ] 10-09: App store assets, legal pages, help/FAQ, and launch prep

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5/6/7 (parallel-eligible) -> 8 -> 9 -> 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 0/5 | Not started | - |
| 2. Profiles & Identity | 0/5 | Not started | - |
| 3. Ride Posting & Search | 0/6 | Not started | - |
| 4. Booking & Ride Management | 0/5 | Not started | - |
| 5. Communication & Notifications | 0/6 | Not started | - |
| 6. Ratings, Trust & Safety | 0/5 | Not started | - |
| 7. Live Location | 0/4 | Not started | - |
| 8. Flexible Rides & Gamification | 0/6 | Not started | - |
| 9. Web Platform & SEO | 0/6 | Not started | - |
| 10. Polish, Testing & Launch | 0/9 | Not started | - |
