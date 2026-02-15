# Festapp Rideshare

## What This Is

A free, community-driven ride-sharing platform that connects drivers with empty seats to passengers heading the same direction. Focused on longer-distance trips between cities (e.g., Prague-Brno, Ostrava-Brno). Aims to be a better, fee-free alternative to BlaBlaCar with real-time features and flexible ride planning. Part of the Festapp platform ecosystem, with future event/festival integration planned.

## Core Value

Drivers and passengers can find each other for shared rides quickly and effortlessly — simpler, more trustworthy, and completely free.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Drivers can post rides with origin, destination, departure time, available seats, and suggested price
- [ ] Passengers can search and find rides by route and date
- [ ] Passengers can book a seat (instant book or request-and-approve, driver chooses per ride)
- [ ] In-app chat between driver and passenger after booking
- [ ] Option to share contact info (phone number) after booking confirmed
- [ ] Live location sharing so driver and passenger can find each other at pickup
- [ ] Flexible rides — driver posts a route intent ("I'll drive this route but don't know when yet"), passengers subscribe and get notified when the driver decides to go
- [ ] User profiles with photo, ratings, and verification badges
- [ ] Mutual ratings and reviews after completed rides
- [ ] Social profile linking (Instagram, Facebook) on user profiles
- [ ] Phone-based authentication as primary method (via Supabase Auth)
- [ ] Push notifications for bookings, ride updates, flexible ride alerts
- [ ] App suggests fair price based on distance/fuel cost (users settle payment in cash)
- [ ] Suggested pickup points along the route
- [ ] Event pages — users create events (concerts, festivals, meetups), admin approves, dedicated page with ride listings
- [ ] AI & Voice — natural language ride creation/search/booking, voice input, MCP server for external AI assistants

### Out of Scope

- In-app payment processing — users settle in cash, app only suggests price
- Festapp platform API integration — manual event creation only in v1, API import in v2
- Real-time ride-hailing (Uber-style) — this is pre-planned carpooling, not on-demand
- Bus/public transport integration — focus on carpooling only

## Context

- **Competitor:** BlaBlaCar is the dominant player (80M+ users, 22 countries) but has significant user pain points: last-minute cancellations without consequences, no real-time location sharing, no flexible/tentative ride posting, broken notifications, high service fees, and poor driver accountability (2.6/5 rating on review sites)
- **Differentiators over BlaBlaCar:**
  1. Live location sharing for pickup coordination (BlaBlaCar has nothing for this)
  2. Flexible rides with route intent + subscriber notifications (entirely new concept)
  3. Completely free — no service fees, donation-based model
  4. Social profile linking for trust building
- **Business model:** Donation-based. No fees for drivers or passengers.
- **Target market:** Czech Republic initially (Prague, Brno, Ostrava corridors), expandable
- **Future:** Festapp event integration will allow creating ride groups for specific festivals/events

## Constraints

- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions) — decided
- **Web:** Next.js with TypeScript — decided
- **Mobile:** Expo (React Native) with TypeScript — decided
- **Architecture:** TypeScript monorepo (shared types, validation, Supabase queries between web and mobile)
- **Maps:** Google Maps or MapLibre — to be decided during implementation
- **Auth:** Supabase Auth with phone number as primary method (email, social login also available)
- **SMS:** AWS SNS via custom Supabase Auth hook (cheapest SMS to CZ/SK at ~$0.035/SMS)
- **Email:** AWS SES for transactional emails ($0.10/1000 emails)
- **Push:** OneSignal for push notifications (mobile + web push)
- **Data access:** Prefer Supabase RPC functions (PostgreSQL functions) over direct table queries for write operations and complex reads. Direct queries only for simple reads protected by RLS.
- **DB schema files:** All table definitions in `tables.sql`. Each RPC/Edge function in its own `.sql` file (e.g., `book_ride.sql`, `cancel_booking.sql`). Version-controlled alongside code.
- **Reference codebase:** Festapp (`/Users/miakh/source/festapp`) — adopt proven patterns (see `.planning/research/FESTAPP_PATTERNS.md`)
- **Deployment:** Netlify for web (Next.js), EAS Build for mobile (Expo)
- **Supabase:** Single project (no separate dev/staging/prod for now)
- **Cost:** Minimize infrastructure costs (Supabase free tier, AWS for email/SMS, open-source map options)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for backend | Managed PostgreSQL + Auth + Realtime + Edge Functions. Good free tier, excellent TypeScript SDK | — Pending |
| Next.js for web | Most popular React framework, SSR, great ecosystem | — Pending |
| Expo (React Native) for mobile | One codebase for iOS + Android, TypeScript shared with web, mature ecosystem (123K GitHub stars) | — Pending |
| TypeScript monorepo | Share types, validation, and Supabase queries between web and mobile apps | — Pending |
| No in-app payments | Simplifies v1 enormously, avoids payment processor fees, aligns with free/donation model | — Pending |
| Cash between users | App suggests price, users settle themselves. No payment processing overhead | — Pending |
| Phone auth as primary | Verified phone = more trust. Supabase supports it out of the box | — Pending |
| AWS SNS for SMS | Cheapest SMS provider to CZ/SK (~$0.035/SMS vs $0.065 Twilio). Custom Supabase Auth hook required | — Pending |
| AWS SES for email | Cheapest email ($0.10/1K). User has AWS experience. Transactional emails via Edge Functions | — Pending |
| OneSignal for push | Web push + mobile push + scheduling. Better than Expo Push for PWA-first strategy | — Pending |
| RPC-first data access | Prefer Supabase RPC (PostgreSQL functions) for writes + complex reads. Atomic transactions, hidden table structure, server-side validation. Direct queries only for simple reads with RLS | — Pending |
| Web + PWA first, app stores later | Launch web as PWA first. Mobile native apps released to stores in a later phase. Faster to market, iterate on web, then polish for stores | — Pending |

---
*Last updated: 2026-02-15 after initialization*
