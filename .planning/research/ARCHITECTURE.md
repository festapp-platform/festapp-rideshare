# Architecture Research

**Domain:** Community ride-sharing / carpooling platform
**Researched:** 2026-02-15
**Confidence:** HIGH (stack decided, patterns well-documented by Supabase and Turborepo ecosystems)

## System Overview

```
                           Clients
┌──────────────────────────────────────────────────────┐
│  ┌───────────────────┐    ┌────────────────────────┐ │
│  │  Next.js Web App  │    │  Expo Mobile App       │ │
│  │  (App Router SSR) │    │  (iOS + Android)       │ │
│  └────────┬──────────┘    └───────────┬────────────┘ │
└───────────┼───────────────────────────┼──────────────┘
            │                           │
            │  @festapp/shared (types,  │
            │  validation, queries)     │
            │                           │
┌───────────┴───────────────────────────┴──────────────┐
│                    Supabase Platform                  │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐    │
│  │   Auth   │  │ PostgREST│  │  Edge Functions  │    │
│  │ (OAuth + │  │  (REST   │  │  (price calc,    │    │
│  │  email)  │  │   API)   │  │   notifications, │    │
│  └──────────┘  └──────────┘  │   geocoding)     │    │
│                               └─────────────────┘    │
│  ┌──────────────────────┐  ┌──────────────────────┐  │
│  │   Realtime           │  │   Storage            │  │
│  │   - Broadcast (loc)  │  │   (avatars, car      │  │
│  │   - Presence (online)│  │    photos)            │  │
│  │   - DB Changes (chat)│  │                       │  │
│  └──────────────────────┘  └──────────────────────┘  │
├──────────────────────────────────────────────────────┤
│                   PostgreSQL + PostGIS                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌─────┐ ┌──────────┐   │
│  │Users │ │Rides │ │Book- │ │Chat │ │ Reviews  │   │
│  │      │ │      │ │ings  │ │     │ │          │   │
│  └──────┘ └──────┘ └──────┘ └─────┘ └──────────┘   │
│         Row Level Security on all tables             │
└──────────────────────────────────────────────────────┘
            │
┌───────────┴──────────────────────────────────────────┐
│                 External Services                     │
│  ┌───────────────┐  ┌────────────────────────────┐   │
│  │  Google Maps / │  │  Push Notification Service │   │
│  │  MapLibre      │  │  (Expo Push / FCM / APNs) │   │
│  └───────────────┘  └────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Next.js Web App** | SSR web interface, SEO for ride listings, desktop experience | App Router with server components, middleware for auth token refresh |
| **Expo Mobile App** | Native mobile experience, push notifications, background location | Expo Router for navigation, expo-location for GPS, expo-notifications |
| **@festapp/shared** | Single source of truth for types, Zod schemas, Supabase query builders | TypeScript package in monorepo, imported by both apps |
| **Supabase Auth** | User registration, login (email + social), session management | @supabase/ssr for Next.js cookies, @supabase/supabase-js for Expo with SecureStore |
| **PostgREST API** | CRUD for rides, bookings, reviews, profiles | Direct Supabase client calls from apps, protected by RLS |
| **Edge Functions** | Server-side logic: price suggestions, push notification dispatch, ride matching helpers | Deno TypeScript functions, deployed globally, stateless |
| **Realtime - Broadcast** | Ephemeral live location sharing during pickup | Channel per active ride, driver publishes lat/lng, rider subscribes |
| **Realtime - Presence** | Online status, typing indicators in chat | Channel per chat conversation |
| **Realtime - DB Changes** | New chat messages, booking status updates | Postgres Changes listener filtered by conversation_id or ride_id |
| **PostgreSQL + PostGIS** | All persistent data, geospatial ride search, full-text search | PostGIS for nearby queries with `<->` operator, GIN indexes for text search |
| **Storage** | User avatars, car photos | Supabase Storage with RLS policies on buckets |
| **Maps** | Route display, pickup/dropoff selection, live tracking overlay | Google Maps SDK or MapLibre GL (both work; MapLibre is free, Google has better geocoding) |
| **Push Notifications** | Booking requests, chat messages, ride reminders | Expo Push Notifications API forwarding to FCM/APNs |

## Recommended Monorepo Structure

```
festapp-rideshare/
├── apps/
│   ├── web/                          # Next.js App Router
│   │   ├── app/                      # App Router pages
│   │   │   ├── (auth)/               # Auth routes (login, register)
│   │   │   ├── (app)/                # Authenticated app shell
│   │   │   │   ├── rides/            # Ride listing, search, details
│   │   │   │   ├── my-rides/         # User's posted/booked rides
│   │   │   │   ├── chat/             # Chat conversations
│   │   │   │   └── profile/          # User profile, settings
│   │   │   └── layout.tsx            # Root layout with providers
│   │   ├── components/               # Web-specific components
│   │   ├── lib/                      # Web-specific utils
│   │   │   ├── supabase/
│   │   │   │   ├── server.ts         # createServerClient (SSR)
│   │   │   │   ├── client.ts         # createBrowserClient
│   │   │   │   └── middleware.ts     # Auth token refresh
│   │   │   └── maps/                 # Map integration (web)
│   │   ├── middleware.ts             # Next.js middleware (auth refresh)
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                       # Expo (React Native)
│       ├── app/                      # Expo Router (file-based routing)
│       │   ├── (auth)/               # Auth screens
│       │   ├── (tabs)/               # Tab navigation
│       │   │   ├── rides/            # Ride listing, search
│       │   │   ├── my-rides/         # User's rides
│       │   │   ├── chat/             # Chat
│       │   │   └── profile/          # Profile
│       │   └── _layout.tsx           # Root layout
│       ├── components/               # Mobile-specific components
│       ├── lib/                      # Mobile-specific utils
│       │   ├── supabase.ts           # createClient with SecureStore
│       │   ├── location.ts           # expo-location wrapper
│       │   └── notifications.ts      # expo-notifications setup
│       ├── app.json
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared/                       # @festapp/shared
│   │   ├── src/
│   │   │   ├── types/                # TypeScript types
│   │   │   │   ├── database.ts       # Generated Supabase types
│   │   │   │   ├── rides.ts          # Ride domain types
│   │   │   │   ├── bookings.ts       # Booking domain types
│   │   │   │   ├── chat.ts           # Chat domain types
│   │   │   │   └── profiles.ts       # Profile domain types
│   │   │   ├── validation/           # Zod schemas
│   │   │   │   ├── rides.ts          # Ride input validation
│   │   │   │   ├── bookings.ts       # Booking validation
│   │   │   │   └── profiles.ts       # Profile validation
│   │   │   ├── queries/              # Supabase query builders
│   │   │   │   ├── rides.ts          # Ride queries (search, CRUD)
│   │   │   │   ├── bookings.ts       # Booking queries
│   │   │   │   ├── chat.ts           # Chat queries
│   │   │   │   └── profiles.ts       # Profile queries
│   │   │   ├── constants/            # App-wide constants
│   │   │   └── index.ts              # Barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                           # @festapp/ui (optional, phase 2+)
│   │   ├── src/                      # Cross-platform UI primitives
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                       # @festapp/config
│       ├── eslint/                   # Shared ESLint config
│       ├── typescript/               # Shared tsconfig base
│       └── package.json
│
├── supabase/                         # Supabase project config
│   ├── migrations/                   # SQL migrations (version controlled)
│   │   ├── 001_profiles.sql
│   │   ├── 002_rides.sql
│   │   ├── 003_bookings.sql
│   │   ├── 004_chat.sql
│   │   ├── 005_reviews.sql
│   │   └── 006_rls_policies.sql
│   ├── functions/                    # Edge Functions
│   │   ├── _shared/                  # Shared utilities across functions
│   │   │   └── supabase-client.ts
│   │   ├── suggest-price/            # Price suggestion calculator
│   │   ├── send-notification/        # Push notification dispatcher
│   │   └── match-rides/              # Flexible ride matching
│   ├── seed.sql                      # Development seed data
│   └── config.toml                   # Local dev configuration
│
├── turbo.json                        # Turborepo pipeline config
├── pnpm-workspace.yaml               # pnpm workspaces
├── package.json                      # Root package.json
└── tsconfig.base.json                # Base TypeScript config
```

### Structure Rationale

- **apps/web and apps/mobile:** Separate apps because they have fundamentally different Supabase client initialization (SSR cookies vs SecureStore), different navigation patterns, and different platform APIs. They share logic through packages/.
- **packages/shared:** The critical package. Types generated from Supabase schema, Zod validation schemas used on both client and Edge Functions, and query builder functions that both apps import. This eliminates drift between web and mobile data handling.
- **packages/ui:** Deferred to phase 2+. Cross-platform UI is complex and premature to share early. Start with platform-native components, extract shared ones later when patterns emerge.
- **supabase/:** Colocated with the monorepo. Migrations are version-controlled and run via `supabase db push` or `supabase migration up`. Edge Functions live here because they deploy via the Supabase CLI, not via the app build system.

## Data Model

### Core Tables

```sql
-- Profiles extend Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  social_links JSONB DEFAULT '{}',  -- {instagram: "...", facebook: "..."}
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cars owned by users
CREATE TABLE cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  plate_number TEXT,
  seats INT NOT NULL DEFAULT 4,
  photo_url TEXT,
  comfort_level INT CHECK (comfort_level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rides posted by drivers
CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id),
  car_id UUID REFERENCES cars(id),
  origin_location GEOGRAPHY(POINT, 4326) NOT NULL,  -- PostGIS
  origin_address TEXT NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_address TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  seats_available INT NOT NULL,
  suggested_price NUMERIC(10,2),
  price_currency TEXT DEFAULT 'EUR',
  luggage_size TEXT CHECK (luggage_size IN ('none', 'small', 'medium', 'large')),
  is_flexible BOOLEAN DEFAULT false,     -- "route intent" rides
  route_description TEXT,                 -- for flexible rides
  preferences JSONB DEFAULT '{}',        -- smoking, pets, music, chat
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Waypoints for rides with stops
CREATE TABLE ride_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address TEXT NOT NULL,
  order_index INT NOT NULL,
  UNIQUE(ride_id, order_index)
);

-- Bookings (instant or request/approve)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id),
  passenger_id UUID NOT NULL REFERENCES profiles(id),
  seats_booked INT NOT NULL DEFAULT 1,
  pickup_location GEOGRAPHY(POINT, 4326),
  pickup_address TEXT,
  dropoff_location GEOGRAPHY(POINT, 4326),
  dropoff_address TEXT,
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')
  ),
  booking_type TEXT DEFAULT 'request' CHECK (booking_type IN ('instant', 'request')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat conversations (1:1 between driver and passenger per ride)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id),
  driver_id UUID NOT NULL REFERENCES profiles(id),
  passenger_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ride_id, passenger_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews (after ride completion)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  reviewee_id UUID NOT NULL REFERENCES profiles(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id, reviewer_id)
);

-- Flexible ride subscriptions (notifications when matching rides appear)
CREATE TABLE ride_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  origin_location GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  radius_km NUMERIC DEFAULT 15,
  departure_after TIMESTAMPTZ,
  departure_before TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Push notification tokens
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);
```

### Key Indexes

```sql
-- Geospatial indexes for ride search
CREATE INDEX idx_rides_origin ON rides USING GIST (origin_location);
CREATE INDEX idx_rides_destination ON rides USING GIST (destination_location);
CREATE INDEX idx_rides_departure ON rides (departure_time) WHERE status = 'active';

-- Chat performance
CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);

-- Booking lookups
CREATE INDEX idx_bookings_ride ON bookings (ride_id) WHERE status != 'cancelled';
CREATE INDEX idx_bookings_passenger ON bookings (passenger_id);

-- Subscription matching
CREATE INDEX idx_subscriptions_origin ON ride_subscriptions USING GIST (origin_location) WHERE is_active;
```

## Data Flow

### Ride Search Flow

```
User enters origin + destination + date
    |
    v
Client calls shared query builder (packages/shared/queries/rides.ts)
    |
    v
Supabase PostgREST call with RPC function:
  nearby_rides(origin_point, dest_point, radius_km, date)
    |
    v
PostgreSQL + PostGIS:
  ST_DWithin(origin_location, $1, $radius)
  AND ST_DWithin(destination_location, $2, $radius)
  AND departure_time BETWEEN $date AND $date + interval '1 day'
  AND status = 'active'
  ORDER BY origin_location <-> $1
    |
    v
Results with distance, driver profile, car info
returned to client via PostgREST
```

### Booking Flow

```
Passenger taps "Book" or "Request"
    |
    v
Client validates with Zod schema (packages/shared/validation/bookings.ts)
    |
    v
Supabase INSERT into bookings table
    |
    ├─── instant booking: status = 'approved', seats_available decremented
    │    (handled by database trigger)
    │
    └─── request booking: status = 'pending'
         |
         v
    Database trigger fires Edge Function: send-notification
         |
         v
    Edge Function looks up driver's push_token,
    sends Expo Push Notification
         |
         v
    Driver approves/rejects via app
         |
         v
    UPDATE bookings SET status = 'approved'/'rejected'
         |
         v
    Database trigger notifies passenger
```

### Chat Flow

```
User sends message
    |
    v
Client INSERT into messages table via Supabase client
    |
    v
PostgreSQL writes message
    |
    ├─── Realtime (Postgres Changes) broadcasts INSERT
    │    to conversation channel subscribers
    │    → Other participant's UI updates instantly
    │
    └─── Database trigger fires send-notification Edge Function
         → Push notification to offline recipient
```

### Live Location Sharing Flow (Pickup)

```
Driver starts sharing location (ride in_progress)
    |
    v
Mobile app gets GPS coordinates via expo-location
    |
    v
Supabase Realtime Broadcast on channel: ride:{ride_id}:location
    |                    (ephemeral, NOT stored in DB)
    v
Passenger subscribed to same channel receives lat/lng
    |
    v
Map marker updates on passenger's device
    |
    Note: Broadcast is peer-to-peer via Realtime server.
    No database writes. Low latency. Stops when ride starts.
```

### Auth Flow (Web vs Mobile Difference)

```
WEB (Next.js):
  @supabase/ssr → cookie-based sessions
  middleware.ts refreshes token on every request
  Server Components use createServerClient(cookies)
  Client Components use createBrowserClient()
  NEVER trust getSession() on server — always use getUser()

MOBILE (Expo):
  @supabase/supabase-js → SecureStore for token persistence
  createClient({ auth: { storage: ExpoSecureStore } })
  No SSR, no middleware, no cookies
  Session refreshed by supabase-js automatically

SHARED:
  Both import types + Zod schemas from @festapp/shared
  Both use same query builder functions
  Supabase client instance created per-platform, passed to shared queries
```

## Architectural Patterns

### Pattern 1: Shared Query Builders with Platform-Specific Clients

**What:** Query logic lives in `packages/shared`, accepts a Supabase client as parameter. Each app creates the client differently but calls the same queries.
**When to use:** Every data operation.
**Trade-offs:** Slight indirection (passing client), but eliminates all query duplication and drift.

**Example:**
```typescript
// packages/shared/src/queries/rides.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export function searchRides(
  client: SupabaseClient<Database>,
  params: {
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    radiusKm?: number;
    departureDate: string;
  }
) {
  return client.rpc('nearby_rides', {
    origin_lat: params.originLat,
    origin_lng: params.originLng,
    dest_lat: params.destLat,
    dest_lng: params.destLng,
    radius_km: params.radiusKm ?? 15,
    departure_date: params.departureDate,
  });
}

// apps/web/app/(app)/rides/page.tsx (Server Component)
import { createServerClient } from '@/lib/supabase/server';
import { searchRides } from '@festapp/shared/queries/rides';

export default async function RidesPage({ searchParams }) {
  const supabase = await createServerClient();
  const { data } = await searchRides(supabase, searchParams);
  // render...
}

// apps/mobile/app/(tabs)/rides/index.tsx
import { supabase } from '@/lib/supabase';
import { searchRides } from '@festapp/shared/queries/rides';

export default function RidesScreen() {
  useEffect(() => {
    searchRides(supabase, params).then(({ data }) => setRides(data));
  }, [params]);
}
```

### Pattern 2: RLS as the Authorization Layer

**What:** Row Level Security policies on every table enforce who can read/write what. The API layer does not need custom authorization middleware — PostgreSQL handles it.
**When to use:** All data access.
**Trade-offs:** RLS policies can become complex. Always index columns used in RLS policies for performance.

**Key policies:**
```sql
-- Rides: anyone can read active rides, only driver can update their own
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rides"
  ON rides FOR SELECT
  USING (status = 'active' OR driver_id = auth.uid());

CREATE POLICY "Drivers can insert their own rides"
  ON rides FOR INSERT
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own rides"
  ON rides FOR UPDATE
  USING (driver_id = auth.uid());

-- Messages: only conversation participants can read/write
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE driver_id = auth.uid() OR passenger_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT id FROM conversations
      WHERE driver_id = auth.uid() OR passenger_id = auth.uid()
    )
  );
```

### Pattern 3: Database Triggers for Side Effects

**What:** Use PostgreSQL triggers + `pg_net` or database webhooks to call Edge Functions when data changes, instead of orchestrating side effects in application code.
**When to use:** Notifications, denormalized counters (rating_avg), seat availability updates.
**Trade-offs:** Harder to debug than application code. Keep triggers simple — just fire the webhook, let the Edge Function handle logic.

**Example:**
```sql
-- When a booking is approved, decrement available seats
CREATE OR REPLACE FUNCTION handle_booking_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE rides
    SET seats_available = seats_available - NEW.seats_booked
    WHERE id = NEW.ride_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_approved
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION handle_booking_approved();
```

### Pattern 4: Realtime Channel Strategy

**What:** Use different Realtime features for different needs. Do not put everything on Postgres Changes.
**When to use:** Any real-time feature.

| Need | Realtime Feature | Channel Topic | Reason |
|------|-----------------|---------------|--------|
| Chat messages | Postgres Changes | `chat:{conversation_id}` | Messages must persist; DB change listener is natural |
| Typing indicators | Broadcast | `chat:{conversation_id}:typing` | Ephemeral, no storage needed |
| Online presence | Presence | `ride:{ride_id}:presence` | Track who is online in ride context |
| Live location | Broadcast | `ride:{ride_id}:location` | Ephemeral GPS coords, high frequency, no DB writes |
| Booking updates | Postgres Changes | `bookings:{ride_id}` | Status changes must persist |

### Pattern 5: Edge Functions for Server-Only Logic

**What:** Use Edge Functions only for things that cannot run on the client: secret API keys, cross-user operations, scheduled tasks.
**When to use:** Price calculation (could use external distance API), push notification dispatch (requires server token), ride subscription matching (queries across users).
**Design:** Few large functions, not many small ones. Share utilities in `supabase/functions/_shared/`.

## Anti-Patterns

### Anti-Pattern 1: Shared UI Package Too Early

**What people do:** Create a `packages/ui` with shared React components from day one, trying to share buttons, cards, and layouts between web and mobile.
**Why it's wrong:** React Native and React DOM have fundamentally different primitives (`<View>` vs `<div>`, `<Text>` vs `<span>`). Cross-platform UI libraries (Tamagui, NativeWind) add complexity. You spend more time fighting the abstraction than building features.
**Do this instead:** Build web and mobile UIs independently for the first 2-3 phases. Extract shared UI components only after you see clear duplication patterns. Share logic (types, validation, queries) from day one, share UI later.

### Anti-Pattern 2: Bypassing RLS with Service Role Key in Client Code

**What people do:** Use the `service_role` key in client-side code to skip RLS when policies get complex.
**Why it's wrong:** The service role key bypasses ALL security. If it leaks (and client-side keys always can), your entire database is exposed.
**Do this instead:** Fix your RLS policies. If a policy is too complex for RLS, move it to an Edge Function that uses the service role key server-side and returns filtered results.

### Anti-Pattern 3: Storing Live Location in the Database

**What people do:** INSERT GPS coordinates into a `locations` table every few seconds during live tracking.
**Why it's wrong:** Creates massive write volume. Location data during pickup is ephemeral — it only matters in real time, not historically.
**Do this instead:** Use Supabase Realtime Broadcast for live location. It is peer-to-peer through the Realtime server with no database writes. Only store location snapshots if you need a trip history feature later.

### Anti-Pattern 4: Fat Edge Functions Replacing PostgREST

**What people do:** Route all CRUD through Edge Functions instead of using PostgREST directly.
**Why it's wrong:** Edge Functions have cold starts and add latency. PostgREST is highly optimized for CRUD. You lose the benefits of RLS-as-authorization.
**Do this instead:** Use PostgREST (via `supabase.from('table')`) for all standard CRUD. Use Edge Functions only for operations that need server-side secrets, cross-table transactions, or external API calls.

### Anti-Pattern 5: One Giant Realtime Channel

**What people do:** Subscribe all users to a single channel for all events.
**Why it's wrong:** Every user receives every event. Supabase Realtime has concurrent connection limits. Performance degrades as users scale.
**Do this instead:** Use specific channels scoped to ride_id or conversation_id. Users only subscribe to channels relevant to their active rides/conversations.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Google Maps / MapLibre** | Client-side SDK in both apps | Google: better geocoding + autocomplete, costs money. MapLibre: free tiles, needs separate geocoding (Nominatim or Photon). Decision needed per phase. |
| **Expo Push Notifications** | Edge Function calls `https://exp.host/--/api/v2/push/send` | Expo handles FCM/APNs routing. Store push tokens in `push_tokens` table. Edge Function triggered by DB webhooks. |
| **Supabase Auth Providers** | Configured in Supabase Dashboard | Google, Apple, Facebook OAuth. Email/password as fallback. Social profile linking is just storing provider metadata. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Web <-> Shared | Direct TypeScript import | pnpm workspace link, Turborepo handles build order |
| Mobile <-> Shared | Direct TypeScript import | Same as web; Expo resolves monorepo packages natively (SDK 52+) |
| Apps <-> Supabase | HTTPS (PostgREST) + WebSocket (Realtime) | Supabase client handles both; RLS secures data |
| Edge Functions <-> DB | Direct Postgres connection | Edge Functions can use `supabase.from()` or raw SQL via `postgres` module |
| Edge Functions <-> External | HTTPS fetch | For push notifications, geocoding APIs |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Default Supabase free/pro plan is fine. Single region. No optimization needed. |
| 1k-10k users | Add database indexes on hot queries (ride search). Consider Supabase Pro for more Realtime connections (default: 200 concurrent on free, 500 on Pro). Cache ride search results on client. |
| 10k-100k users | Move to Supabase Team plan for connection pooling (Supavisor). Add read replicas for ride search if write-heavy. Consider pg_cron for cleanup jobs (expired rides, old messages). |
| 100k+ users | Beyond community ride-sharing scope. Would need custom infrastructure. |

### Scaling Priorities

1. **First bottleneck: Realtime connections.** Each user with chat open or live tracking = 1+ concurrent channel. Supabase limits this per plan. Mitigation: only subscribe to Realtime channels when user is actively viewing that screen. Unsubscribe on navigate away.
2. **Second bottleneck: Geospatial queries.** PostGIS with proper GIST indexes handles this well up to millions of rides. Ensure `nearby_rides` RPC function uses indexed columns and `ST_DWithin` (uses index) not `ST_Distance` (full scan).
3. **Third bottleneck: Edge Function cold starts.** For latency-sensitive paths (push notifications), warm functions stay active per plan tier. For price calculation, consider caching results.

## Build Order (Dependencies Between Components)

The architecture has clear dependency chains that dictate build order:

```
Phase 1: Foundation
  Database schema + RLS policies
  → Supabase Auth setup
  → @festapp/shared (types from schema, basic Zod schemas)
  → Monorepo scaffolding (Turborepo + pnpm)

Phase 2: Core CRUD
  @festapp/shared query builders
  → Web app: ride CRUD, basic search (no geo yet)
  → Mobile app: ride CRUD, basic search
  (Web and mobile can be built in parallel once shared is ready)

Phase 3: Geospatial
  PostGIS extension + nearby_rides RPC function
  → Map integration in both apps
  → Ride search with location

Phase 4: Booking
  Bookings table + RLS
  → Booking flow (instant + request/approve)
  → Edge Function: send-notification
  → Push token registration in mobile app

Phase 5: Chat
  Conversations + Messages tables
  → Realtime Postgres Changes subscription
  → Chat UI in both apps
  → Typing indicators via Broadcast

Phase 6: Live Features
  Realtime Broadcast for location sharing
  → Presence for online status
  → Map overlay with live driver position

Phase 7: Social
  Reviews table + triggers for rating aggregation
  → Profile enhancement (social links, preferences)
  → Flexible rides + subscription matching
```

**Key dependency insight:** The shared package and database schema must come first. Everything else builds on top. Web and mobile development can largely run in parallel once the shared package exists, because they consume the same queries and types.

## Sources

- [Supabase Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture) - HIGH confidence
- [Supabase Realtime Concepts](https://supabase.com/docs/guides/realtime/concepts) - HIGH confidence
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture) - HIGH confidence
- [Supabase PostGIS Documentation](https://supabase.com/docs/guides/database/extensions/postgis) - HIGH confidence
- [Supabase Realtime Location Sharing with MapLibre](https://supabase.com/blog/postgres-realtime-location-sharing-with-maplibre) - HIGH confidence
- [Supabase SSR Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - HIGH confidence
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - HIGH confidence
- [Supabase Edge Functions Development Tips](https://supabase.com/docs/guides/functions/development-tips) - HIGH confidence
- [Turborepo Monorepo in 2025: Next.js + React Native](https://medium.com/@beenakumawat002/turborepo-monorepo-in-2025-next-js-react-native-shared-ui-type-safe-api-%EF%B8%8F-6194c83adff9) - MEDIUM confidence
- [byCedric/expo-monorepo-example](https://github.com/byCedric/expo-monorepo-example) - MEDIUM confidence
- [Carpooling Data Model (Vertabelo/Red Gate)](https://www.red-gate.com/blog/creating-a-data-model-for-carpooling/) - MEDIUM confidence
- [Uber System Design (GeeksforGeeks)](https://www.geeksforgeeks.org/system-design/system-design-of-uber-app-uber-system-architecture/) - MEDIUM confidence
- [Supabase RLS Best Practices (MakerKit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) - MEDIUM confidence

---
*Architecture research for: Festapp Rideshare — community ride-sharing platform*
*Researched: 2026-02-15*
