# Requirements: Festapp Rideshare

**Defined:** 2026-02-15
**Core Value:** Drivers and passengers can find each other for shared rides quickly and effortlessly -- simpler, more trustworthy, and completely free.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign up and log in with phone number + SMS verification (primary method)
- [ ] **AUTH-02**: User can sign up and log in with email, Google, or Apple (via Supabase Auth)
- [ ] **AUTH-03**: User session persists across app restarts and browser refresh
- [ ] **AUTH-04**: User can log out from any screen
- [ ] **AUTH-05**: User can delete their account and all associated data (required by app stores)
- [ ] **AUTH-06**: User can reset password via email link (for email auth users)

### Profiles

- [ ] **PROF-01**: User can create profile with display name and avatar photo
- [ ] **PROF-02**: User can write a short bio
- [ ] **PROF-03**: User can link social profiles (Instagram, Facebook) to their profile
- [ ] **PROF-04**: User profile shows verification badge (phone verified)
- [ ] **PROF-05**: User can view other users' profiles with their ratings, bio, and social links
- [ ] **PROF-06**: User profile shows driver reliability score (cancellation rate, completed rides)
- [ ] **PROF-07**: Driver can add vehicle info (make, model, color, license plate number) and car photo
- [ ] **PROF-08**: Vehicle info and car photo are visible to passengers on ride details and search results
- [ ] **PROF-09**: User can edit their profile, bio, avatar, and vehicle info at any time
- [ ] **PROF-10**: Driver can upload driver's license or ID for enhanced verification badge

### Ride Posting

- [ ] **RIDE-01**: Driver can post a ride with origin, destination, departure date/time, and available seats
- [ ] **RIDE-02**: App suggests a fair price based on distance and estimated fuel cost
- [ ] **RIDE-03**: Driver can adjust the suggested price within reasonable limits
- [ ] **RIDE-04**: App suggests pickup points along the route
- [ ] **RIDE-05**: Driver can choose between instant booking or request-and-approve mode per ride
- [ ] **RIDE-06**: Driver can post a flexible ride (route intent -- "I'll drive this route but don't know when yet")
- [ ] **RIDE-07**: Driver can edit a ride's details before departure (time, seats, price, pickup points)
- [ ] **RIDE-08**: Driver can delete a ride (notifies all booked passengers)
- [ ] **RIDE-09**: Ride displays estimated trip duration and distance
- [ ] **RIDE-10**: Rides with past departure dates are automatically expired and archived
- [ ] **RIDE-11**: Origin and destination input uses address autocomplete (Google Places or equivalent)
- [ ] **RIDE-12**: Ride has clear status flow: Upcoming -> In Progress -> Completed / Cancelled

### Ride Search & Details

- [ ] **SRCH-01**: Passenger can search for rides by origin, destination, and date
- [ ] **SRCH-02**: Search uses geospatial matching to find rides passing near the passenger's origin and destination
- [ ] **SRCH-03**: Search results show driver profile, rating, vehicle info, price, available seats, and departure time
- [ ] **SRCH-04**: Passenger can filter and sort search results (by price, time, rating)
- [ ] **SRCH-05**: Passenger can view full ride detail page with route on map, driver profile, pickup points, and booking action
- [ ] **SRCH-06**: Ride can be shared via deep link (opens in app or web)
- [ ] **SRCH-07**: User can save favorite routes for quick repeat searches
- [ ] **SRCH-08**: Passenger can see who else is booked on a ride (co-passengers with names and ratings)

### Booking

- [ ] **BOOK-01**: Passenger can instantly book a seat (or multiple seats) on rides with instant booking enabled
- [ ] **BOOK-02**: Passenger can request a seat on rides with request-and-approve mode; driver can accept or reject
- [ ] **BOOK-03**: Driver and passenger can view their upcoming and past rides (My Rides screen)
- [ ] **BOOK-04**: Driver or passenger can cancel a booking with a reason
- [ ] **BOOK-05**: Cancellation notifies the other party and is tracked for reliability scoring
- [ ] **BOOK-06**: Driver can mark a ride as completed, triggering the rating prompt for all participants
- [ ] **BOOK-07**: Driver can view the list of passengers booked on their ride and manage requests

### Communication

- [ ] **CHAT-01**: Driver and passenger can chat 1:1 after booking is confirmed
- [ ] **CHAT-02**: Chat shows typing indicators and read receipts
- [ ] **CHAT-03**: User can share their phone number with the other party after booking is confirmed
- [ ] **CHAT-04**: Chat messages persist and are accessible from ride history

### Notifications

- [ ] **NOTF-01**: User receives push notification for new booking requests (driver) and booking confirmations (passenger)
- [ ] **NOTF-02**: User receives push notification for new chat messages
- [ ] **NOTF-03**: User receives push notification when a flexible ride they subscribed to gets a confirmed date
- [ ] **NOTF-04**: User receives push notification for booking cancellations
- [ ] **NOTF-05**: Push notifications managed via OneSignal (mobile + web)
- [ ] **NOTF-06**: User can manage notification preferences (toggle categories on/off)
- [ ] **NOTF-07**: User receives ride reminder notification before departure ("Your ride is in 1 hour")
- [ ] **NOTF-08**: User receives email notification for important events (booking confirmation, ride reminder, cancellation)
- [ ] **NOTF-09**: Email notifications respect user's notification preferences

### Live Location

- [ ] **LIVE-01**: Driver can activate live location sharing when approaching the pickup point
- [ ] **LIVE-02**: Passenger can see driver's real-time position on a map during pickup
- [ ] **LIVE-03**: Location sharing uses adaptive GPS (battery-efficient -- balanced accuracy, distance filtering)
- [ ] **LIVE-04**: Location sharing automatically stops after pickup is confirmed or ride begins

### Ratings & Trust

- [ ] **RATE-01**: After a completed ride, both driver and passenger can rate each other (1-5 stars)
- [ ] **RATE-02**: User can write a text review along with their rating
- [ ] **RATE-03**: Ratings and reviews are visible on user profiles
- [ ] **RATE-04**: User can report another user for inappropriate behavior
- [ ] **RATE-05**: User can block another user (blocked user's rides/messages become invisible)

### Flexible Rides

- [ ] **FLEX-01**: Driver can create a route intent (regular route without a specific date)
- [ ] **FLEX-02**: Passenger can subscribe to a route intent to get notified when the driver decides to go
- [ ] **FLEX-03**: When driver confirms a date for a flexible ride, all subscribers receive a push notification
- [ ] **FLEX-04**: Subscribers can then book a seat on the confirmed ride through the normal booking flow

### Gamification

- [ ] **GAME-01**: Personal impact dashboard showing total CO2 saved, money saved, and rides completed
- [ ] **GAME-02**: Achievement badges earned through real activity (e.g., "First Ride", "Road Buddy" at 10 rides, "Highway Hero" at 50 rides, "Eco Champion" at 100 kg CO2 saved, "Trusted Driver" at 20 rides with 4.5+ rating, "Explorer" for 5+ different routes)
- [ ] **GAME-03**: Badges are displayed on user profile and visible to other users
- [ ] **GAME-04**: User levels based on completed rides + average rating: New -> Regular -> Experienced -> Ambassador
- [ ] **GAME-05**: User level is shown on profile and in search results (builds trust with strangers)
- [ ] **GAME-06**: Route streaks -- track consecutive weeks of sharing a specific route
- [ ] **GAME-07**: Community stats page -- platform-wide totals (total CO2 saved, total rides shared, total money saved by community)
- [ ] **GAME-08**: Impact stats are shareable -- user can share their personal impact to social media or as a link

### Web Platform

- [ ] **WEB-01**: Web app is a PWA (Progressive Web App) -- installable on mobile and desktop
- [ ] **WEB-02**: Web app has full feature parity with mobile app for core flows (search, book, chat, profile)
- [ ] **WEB-03**: Ride pages are SEO-optimized and indexable by search engines (SSR/SSG)
- [ ] **WEB-04**: Responsive design -- works seamlessly on mobile browsers, tablets, and desktop
- [ ] **WEB-05**: Open Graph / social meta tags -- shared ride links show rich preview on WhatsApp, Facebook, Twitter (route, price, seats, driver)
- [ ] **WEB-06**: Web push notifications via OneSignal (booking updates, messages, reminders -- for users without native app)
- [ ] **WEB-07**: Service worker with caching strategy for offline PWA support and fast page loads
- [ ] **WEB-08**: Short URL structure with random IDs (e.g., `/ride/x7k9m2`, `/u/a3b8f1`)
- [ ] **WEB-09**: API rate limiting on all public endpoints (web + mobile) to prevent abuse and spam

### Admin Panel

- [ ] **ADMN-01**: Admin can view and manage reported users (warn, suspend, ban)
- [ ] **ADMN-02**: Admin can view basic platform stats (rides posted, active users, bookings, cancellation rates)
- [ ] **ADMN-03**: Admin can view and manage reported content/reviews
- [ ] **ADMN-04**: Admin panel is a protected web-only dashboard (Next.js, role-based access via Supabase RLS)

### Testing & Quality

- [ ] **TEST-01**: Unit tests for all shared package logic (validation, price calculation, utilities)
- [ ] **TEST-02**: Unit tests for Supabase query builders and data transformations
- [ ] **TEST-03**: Integration tests for Supabase Edge Functions (booking, notifications, pricing)
- [ ] **TEST-04**: Integration tests for auth flows (sign up, login, session persistence, logout, delete account)
- [ ] **TEST-05**: Integration tests for core business flows (post ride -> search -> book -> complete -> rate)
- [ ] **TEST-06**: UI/component tests for critical screens (ride search, ride detail, booking, chat, profile)
- [ ] **TEST-07**: E2E tests for the full user journey on web (Next.js -- using Playwright or Cypress)
- [ ] **TEST-08**: E2E tests for the full user journey on mobile (Expo -- using Detox or Maestro)
- [ ] **TEST-09**: Database tests for RLS policies (verify access control works correctly)
- [ ] **TEST-10**: CI pipeline runs all tests on every PR

### Onboarding

- [ ] **ONBR-01**: Sign-up flow is minimal -- phone number or social login on one screen
- [ ] **ONBR-02**: After sign-up, user creates profile (name + photo) on one screen
- [ ] **ONBR-03**: User selects their role: "I want to drive", "I want to ride", or "Both"
- [ ] **ONBR-04**: If driver role selected, user is prompted to add vehicle info + car photo (one screen, can skip and add later)
- [ ] **ONBR-05**: App requests location permission with clear context ("Find rides near you")
- [ ] **ONBR-06**: App requests notification permission with clear context ("Get notified about bookings and messages")
- [ ] **ONBR-07**: After onboarding, user lands on home screen ready to search or post

### App Structure & Navigation

- [ ] **NAV-01**: Bottom tab navigation: Search, My Rides, Messages, Profile
- [ ] **NAV-02**: Home/Search screen shows search bar (origin, destination, date) and nearby/recent rides
- [ ] **NAV-03**: My Rides screen shows upcoming rides (as driver and passenger) and ride history
- [ ] **NAV-04**: Messages screen shows list of active chat conversations
- [ ] **NAV-05**: Profile screen shows user info, vehicle, ratings, settings access
- [ ] **NAV-06**: Settings screen with: language, notification preferences, account management, help, legal, logout, delete account
- [ ] **NAV-07**: Prominent "Post a ride" action accessible from any screen (FAB or header button)

### Platform & UX

- [ ] **PLAT-01**: Clean, minimal UI with a friendly, playful pastel color palette -- approachable and warm feel
- [ ] **PLAT-02**: App supports Czech, Slovak, and English languages
- [ ] **PLAT-03**: Terms of service and privacy policy pages (required for app stores)
- [ ] **PLAT-04**: Donation prompt -- subtle way for users to support the platform ("Buy us a coffee")
- [ ] **PLAT-05**: App handles offline/poor connectivity gracefully (queue actions, show cached data)
- [ ] **PLAT-06**: GDPR compliance -- user can export their data, cookie consent on web
- [ ] **PLAT-07**: Meaningful empty states ("No rides found -- try a different date") and error pages (404, network error)
- [ ] **PLAT-08**: Help / FAQ page with common questions and contact/support option
- [ ] **PLAT-09**: User can invite friends / share the app via link
- [ ] **PLAT-10**: Splash screen and app icon with Festapp Rideshare branding
- [ ] **PLAT-11**: Skeleton loading states for lists and screens (feels fast while data loads)
- [ ] **PLAT-12**: Crash reporting and error monitoring in production (Sentry or equivalent)
- [ ] **PLAT-13**: Anonymous usage analytics to understand user behavior and inform product decisions
- [ ] **PLAT-14**: Force update mechanism -- prompt users to update when a critical new version is available
- [ ] **PLAT-15**: Basic accessibility -- screen reader labels, sufficient color contrast, touch target sizes
- [ ] **PLAT-16**: App store assets -- screenshots, descriptions, and metadata for iOS App Store and Google Play
- [ ] **PLAT-17**: Image optimization -- avatar and car photos are compressed and thumbnailed on upload (Supabase Storage)
- [ ] **PLAT-18**: Smart web-to-app banner -- "Open in app" prompt when visiting web on a mobile device

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Event Integration

- **EVNT-01**: User can create a ride group for a specific event/festival
- **EVNT-02**: Events can be imported from Festapp platform API
- **EVNT-03**: Passengers can browse rides by event

### Advanced Features

- **ADVN-01**: Recurring rides (daily/weekly commute patterns)
- **ADVN-02**: Multi-stop rides with intermediate pickup/dropoff points
- **ADVN-03**: Ride sharing to social media (share ride link to Instagram stories, etc.)
- **ADVN-04**: Dark mode
- **ADVN-05**: Female-only ride option

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-app payment processing | Users settle in cash. Avoids payment processor complexity and fees. Aligns with free model. |
| Real-time ride-hailing (Uber-style) | This is pre-planned carpooling, not on-demand taxi service |
| Bus/public transport integration | Focus on carpooling only |
| Video calls | Unnecessary for ride coordination -- chat + phone is sufficient |
| Group chat | 1:1 between driver and each passenger is sufficient for v1 |
| Full internationalization (i18n) | Czech + English hardcoded for v1. Proper i18n framework in v2. |
| In-app donation processing | v1 uses external link (Ko-fi, GitHub Sponsors, etc.). In-app mechanism in v2. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| PROF-01 | Phase 2 | Pending |
| PROF-02 | Phase 2 | Pending |
| PROF-03 | Phase 2 | Pending |
| PROF-04 | Phase 2 | Pending |
| PROF-05 | Phase 2 | Pending |
| PROF-06 | Phase 4 | Pending |
| PROF-07 | Phase 2 | Pending |
| PROF-08 | Phase 2 | Pending |
| PROF-09 | Phase 2 | Pending |
| PROF-10 | Phase 2 | Pending |
| RIDE-01 | Phase 3 | Pending |
| RIDE-02 | Phase 3 | Pending |
| RIDE-03 | Phase 3 | Pending |
| RIDE-04 | Phase 3 | Pending |
| RIDE-05 | Phase 3 | Pending |
| RIDE-06 | Phase 8 | Pending |
| RIDE-07 | Phase 3 | Pending |
| RIDE-08 | Phase 3 | Pending |
| RIDE-09 | Phase 3 | Pending |
| RIDE-10 | Phase 3 | Pending |
| RIDE-11 | Phase 3 | Pending |
| RIDE-12 | Phase 3 | Pending |
| SRCH-01 | Phase 3 | Pending |
| SRCH-02 | Phase 3 | Pending |
| SRCH-03 | Phase 3 | Pending |
| SRCH-04 | Phase 3 | Pending |
| SRCH-05 | Phase 3 | Pending |
| SRCH-06 | Phase 3 | Pending |
| SRCH-07 | Phase 3 | Pending |
| SRCH-08 | Phase 3 | Pending |
| BOOK-01 | Phase 4 | Pending |
| BOOK-02 | Phase 4 | Pending |
| BOOK-03 | Phase 4 | Pending |
| BOOK-04 | Phase 4 | Pending |
| BOOK-05 | Phase 4 | Pending |
| BOOK-06 | Phase 4 | Pending |
| BOOK-07 | Phase 4 | Pending |
| CHAT-01 | Phase 5 | Pending |
| CHAT-02 | Phase 5 | Pending |
| CHAT-03 | Phase 5 | Pending |
| CHAT-04 | Phase 5 | Pending |
| NOTF-01 | Phase 5 | Pending |
| NOTF-02 | Phase 5 | Pending |
| NOTF-03 | Phase 8 | Pending |
| NOTF-04 | Phase 5 | Pending |
| NOTF-05 | Phase 5 | Pending |
| NOTF-06 | Phase 5 | Pending |
| NOTF-07 | Phase 5 | Pending |
| NOTF-08 | Phase 5 | Pending |
| NOTF-09 | Phase 5 | Pending |
| LIVE-01 | Phase 7 | Pending |
| LIVE-02 | Phase 7 | Pending |
| LIVE-03 | Phase 7 | Pending |
| LIVE-04 | Phase 7 | Pending |
| RATE-01 | Phase 6 | Pending |
| RATE-02 | Phase 6 | Pending |
| RATE-03 | Phase 6 | Pending |
| RATE-04 | Phase 6 | Pending |
| RATE-05 | Phase 6 | Pending |
| FLEX-01 | Phase 8 | Pending |
| FLEX-02 | Phase 8 | Pending |
| FLEX-03 | Phase 8 | Pending |
| FLEX-04 | Phase 8 | Pending |
| GAME-01 | Phase 8 | Pending |
| GAME-02 | Phase 8 | Pending |
| GAME-03 | Phase 8 | Pending |
| GAME-04 | Phase 8 | Pending |
| GAME-05 | Phase 8 | Pending |
| GAME-06 | Phase 8 | Pending |
| GAME-07 | Phase 8 | Pending |
| GAME-08 | Phase 8 | Pending |
| WEB-01 | Phase 9 | Pending |
| WEB-02 | Phase 9 | Pending |
| WEB-03 | Phase 9 | Pending |
| WEB-04 | Phase 9 | Pending |
| WEB-05 | Phase 9 | Pending |
| WEB-06 | Phase 9 | Pending |
| WEB-07 | Phase 9 | Pending |
| WEB-08 | Phase 9 | Pending |
| WEB-09 | Phase 9 | Pending |
| ADMN-01 | Phase 6 | Pending |
| ADMN-02 | Phase 6 | Pending |
| ADMN-03 | Phase 6 | Pending |
| ADMN-04 | Phase 6 | Pending |
| TEST-01 | Phase 10 | Pending |
| TEST-02 | Phase 10 | Pending |
| TEST-03 | Phase 10 | Pending |
| TEST-04 | Phase 10 | Pending |
| TEST-05 | Phase 10 | Pending |
| TEST-06 | Phase 10 | Pending |
| TEST-07 | Phase 10 | Pending |
| TEST-08 | Phase 10 | Pending |
| TEST-09 | Phase 10 | Pending |
| TEST-10 | Phase 10 | Pending |
| ONBR-01 | Phase 1 | Pending |
| ONBR-02 | Phase 2 | Pending |
| ONBR-03 | Phase 2 | Pending |
| ONBR-04 | Phase 2 | Pending |
| ONBR-05 | Phase 1 | Pending |
| ONBR-06 | Phase 1 | Pending |
| ONBR-07 | Phase 1 | Pending |
| NAV-01 | Phase 1 | Pending |
| NAV-02 | Phase 1 | Pending |
| NAV-03 | Phase 1 | Pending |
| NAV-04 | Phase 1 | Pending |
| NAV-05 | Phase 1 | Pending |
| NAV-06 | Phase 1 | Pending |
| NAV-07 | Phase 3 | Pending |
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 10 | Pending |
| PLAT-03 | Phase 10 | Pending |
| PLAT-04 | Phase 10 | Pending |
| PLAT-05 | Phase 10 | Pending |
| PLAT-06 | Phase 10 | Pending |
| PLAT-07 | Phase 10 | Pending |
| PLAT-08 | Phase 10 | Pending |
| PLAT-09 | Phase 10 | Pending |
| PLAT-10 | Phase 1 | Pending |
| PLAT-11 | Phase 10 | Pending |
| PLAT-12 | Phase 10 | Pending |
| PLAT-13 | Phase 10 | Pending |
| PLAT-14 | Phase 10 | Pending |
| PLAT-15 | Phase 10 | Pending |
| PLAT-16 | Phase 10 | Pending |
| PLAT-17 | Phase 2 | Pending |
| PLAT-18 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 132 total
- Mapped to phases: 132
- Unmapped: 0

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-15 after roadmap creation*
