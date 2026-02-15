# Phase 3: Ride Posting & Search - Research

**Researched:** 2026-02-15
**Domain:** PostGIS geospatial queries, Google Places autocomplete, Google Routes API, ride management, price suggestion, recurring rides, deep links
**Confidence:** HIGH

## Summary

Phase 3 is the core feature phase -- it introduces the `rides` table with PostGIS geography columns, geospatial search via RPC functions, address autocomplete with Google Places API (New), route computation via Google Routes API, a price suggestion algorithm based on distance and Czech fuel costs, and ride lifecycle management. This phase also adds the "Post a ride" FAB, ride detail pages with maps, search results with filtering/sorting, deep links for sharing, and favorite routes.

The existing codebase has placeholder pages for `/search` and `/my-rides` ready to be replaced. The `profiles` and `vehicles` tables from Phase 2 are in place. PostGIS is NOT yet enabled -- the initial migration only enables `uuid-ossp`. The database types in `packages/shared/src/types/database.ts` will need significant extension to cover the new `rides`, `ride_waypoints`, `recurring_ride_patterns`, and `favorite_routes` tables.

**Critical finding:** Google Places Autocomplete (legacy `google.maps.places.Autocomplete`) is no longer available to new customers as of March 1, 2025. New projects MUST use the Places API (New) with `AutocompleteSuggestion.fetchAutocompleteSuggestions()`. The `@vis.gl/react-google-maps` library supports this via `useMapsLibrary('places')`.

**Primary recommendation:** Store rides with both origin/destination POINT geography columns AND a route LINESTRING geography column (computed from Google Routes API at ride creation time). Search using `ST_DWithin` against the route line for corridor matching. Use an Edge Function to call Google Routes API server-side (keeps API key secure, computes distance/duration/polyline in one call). Price suggestion is a simple client-side formula using distance and configurable fuel cost parameters.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.95.3 | Database queries, RPC calls | Already in use |
| @supabase/ssr | ^0.8.0 | Server-side Supabase in Next.js | Already in use |
| react-hook-form | ^7.71.1 | Form state management | Already in both apps |
| @hookform/resolvers | ^5.2.2 | Zod resolver for RHF | Already in both apps |
| zod | 3.25.x | Schema validation | Already in shared package |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vis.gl/react-google-maps | ^1.5 | Google Maps display + Places autocomplete (web) | Ride posting form, search results map, ride detail map |
| @googlemaps/polyline-codec | ^1.0 | Decode Google Routes API encoded polyline to lat/lng array | Converting route polyline for storage as PostGIS LINESTRING |
| date-fns | ^4.1 | Date/time formatting and manipulation | Departure time display, recurring pattern calculation |
| react-native-maps | ^1.27 | Maps on mobile (iOS + Android) | Ride detail map, search results map (mobile) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @vis.gl/react-google-maps | react-google-maps/api | @vis.gl is the official Google-maintained wrapper; older libs don't support Places API (New) |
| Google Places API (New) | Nominatim / Photon (OSS) | Free but worse autocomplete quality, no session pricing, poor Czech address coverage |
| Google Routes API | OSRM (Open Source Routing Machine) | Free but requires self-hosting, no traffic data, more maintenance |
| @googlemaps/polyline-codec | Manual decoding | Encoding algorithm is simple but codec library handles edge cases and is <1KB |

**Installation:**
```bash
# Web app (apps/web)
pnpm add @vis.gl/react-google-maps @googlemaps/polyline-codec date-fns

# Shared package (packages/shared)
pnpm add date-fns

# Mobile app (apps/mobile) - future phase
npx expo install react-native-maps
pnpm add @googlemaps/polyline-codec date-fns
```

## Architecture Patterns

### Recommended Project Structure (New files for Phase 3)
```
supabase/
├── migrations/
│   ├── 00000000000006_enable_postgis.sql        # Enable PostGIS extension
│   ├── 00000000000007_rides.sql                  # Rides table + indexes
│   ├── 00000000000008_ride_waypoints.sql         # Suggested pickup points
│   ├── 00000000000009_recurring_patterns.sql     # Recurring ride patterns
│   ├── 00000000000010_favorite_routes.sql        # Saved favorite routes
│   ├── 00000000000011_rides_rls.sql              # RLS policies for all new tables
│   ├── 00000000000012_ride_search_rpc.sql        # nearby_rides() RPC function
│   └── 00000000000013_ride_expiry_cron.sql       # pg_cron job for ride expiry
├── functions/
│   └── compute-route/                            # Edge Function: Google Routes API proxy
│       └── index.ts
packages/shared/src/
├── types/
│   └── database.ts                               # Extended with rides, waypoints, patterns
├── validation/
│   ├── ride.ts                                   # Ride posting/editing Zod schemas
│   └── search.ts                                 # Search params Zod schema
├── constants/
│   └── pricing.ts                                # Fuel cost, price bounds, CZK constants
└── queries/
    ├── rides.ts                                  # Ride CRUD query builders
    └── search.ts                                 # Search query builders (RPC wrappers)
apps/web/app/(app)/
├── rides/
│   ├── new/
│   │   └── page.tsx                              # Ride posting form
│   └── [id]/
│       └── page.tsx                              # Ride detail page (SSR for SEO/OG)
├── search/
│   └── page.tsx                                  # Search results (replace placeholder)
├── my-rides/
│   └── page.tsx                                  # Driver/passenger ride management
└── components/
    ├── address-autocomplete.tsx                   # Google Places autocomplete input
    ├── ride-card.tsx                              # Ride result card component
    ├── ride-map.tsx                               # Map component for route display
    ├── ride-form.tsx                              # Ride posting/editing form
    ├── search-form.tsx                            # Search bar with autocomplete
    ├── search-filters.tsx                         # Filter/sort controls
    └── post-ride-fab.tsx                          # Floating action button
```

### Pattern 1: PostGIS Geospatial Ride Storage

**What:** Store rides with geography columns for origin point, destination point, AND a route linestring. The linestring enables corridor matching (finding rides that pass near a passenger's origin/destination).
**When to use:** Every ride insert/update.
**Confidence:** HIGH -- verified via [Supabase PostGIS docs](https://supabase.com/docs/guides/database/extensions/postgis) and [PostGIS ST_DWithin docs](https://postgis.net/docs/ST_DWithin.html)

```sql
-- Enable PostGIS (MUST be in extensions schema for Supabase)
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id),
  vehicle_id UUID REFERENCES public.vehicles(id),

  -- Origin/Destination as Points
  origin_location GEOGRAPHY(POINT, 4326) NOT NULL,
  origin_address TEXT NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_address TEXT NOT NULL,

  -- Route as LineString (computed from Google Routes API)
  route_geometry GEOGRAPHY(LINESTRING, 4326),
  route_encoded_polyline TEXT,          -- Original encoded polyline from Google

  -- Ride details
  departure_time TIMESTAMPTZ NOT NULL,
  seats_total INT NOT NULL CHECK (seats_total BETWEEN 1 AND 8),
  seats_available INT NOT NULL CHECK (seats_available BETWEEN 0 AND 8),
  suggested_price_czk NUMERIC(10,2),
  price_czk NUMERIC(10,2),             -- Driver's final price (may differ from suggestion)
  distance_meters INT,                  -- From Routes API
  duration_seconds INT,                 -- From Routes API
  luggage_size TEXT DEFAULT 'medium' CHECK (luggage_size IN ('none', 'small', 'medium', 'large')),
  booking_mode TEXT DEFAULT 'request' CHECK (booking_mode IN ('instant', 'request')),
  preferences JSONB DEFAULT '{}',       -- {smoking: false, pets: false, music: true, chat: true}
  notes TEXT,                           -- Driver's notes to passengers

  -- Status management
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),

  -- Recurring ride link
  recurring_pattern_id UUID,            -- FK added after pattern table creation

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRITICAL: GIST spatial indexes for performant geospatial queries
CREATE INDEX idx_rides_origin_geo ON public.rides USING GIST (origin_location);
CREATE INDEX idx_rides_destination_geo ON public.rides USING GIST (destination_location);
CREATE INDEX idx_rides_route_geo ON public.rides USING GIST (route_geometry);

-- Composite index for active ride search (status + departure time)
CREATE INDEX idx_rides_active_departure ON public.rides (departure_time)
  WHERE status = 'upcoming';

-- Driver's rides lookup
CREATE INDEX idx_rides_driver ON public.rides (driver_id, departure_time DESC);

-- Auto-update updated_at
CREATE TRIGGER update_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Pattern 2: Two-Phase Geospatial Search (BlaBlaCar-inspired)

**What:** Search for rides in two phases: (1) gross matching with PostGIS ST_DWithin against route_geometry for corridor matching, (2) fine-grained filtering on time, seats, price. This mirrors BlaBlaCar's approach: PostGIS for spatial pre-filtering, then application logic for ranking.
**When to use:** The `nearby_rides` RPC function.
**Confidence:** HIGH -- pattern verified via [BlaBlaCar engineering blog](https://medium.com/blablacar/improving-the-matching-performance-for-carpooling-4383a37a9c18) and PostGIS docs.

```sql
-- RPC function for ride search
-- Searches for rides where the route passes within radius_km of both
-- the passenger's origin AND destination
CREATE OR REPLACE FUNCTION public.nearby_rides(
  origin_lat FLOAT,
  origin_lng FLOAT,
  dest_lat FLOAT,
  dest_lng FLOAT,
  search_date DATE,
  radius_km FLOAT DEFAULT 15,
  max_results INT DEFAULT 50
)
RETURNS TABLE (
  ride_id UUID,
  driver_id UUID,
  driver_name TEXT,
  driver_avatar TEXT,
  driver_rating NUMERIC,
  driver_rating_count INT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  origin_address TEXT,
  destination_address TEXT,
  departure_time TIMESTAMPTZ,
  seats_available INT,
  price_czk NUMERIC,
  distance_meters INT,
  duration_seconds INT,
  booking_mode TEXT,
  origin_distance_m FLOAT,    -- Distance from search origin to ride origin
  dest_distance_m FLOAT       -- Distance from search dest to ride dest
)
SET search_path = ''
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id AS ride_id,
    r.driver_id,
    p.display_name AS driver_name,
    p.avatar_url AS driver_avatar,
    p.rating_avg AS driver_rating,
    p.rating_count AS driver_rating_count,
    v.make AS vehicle_make,
    v.model AS vehicle_model,
    v.color AS vehicle_color,
    r.origin_address,
    r.destination_address,
    r.departure_time,
    r.seats_available,
    r.price_czk,
    r.distance_meters,
    r.duration_seconds,
    r.booking_mode,
    -- Distance from search origin to ride route (or origin point as fallback)
    extensions.ST_Distance(
      r.origin_location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(origin_lng, origin_lat), 4326)::extensions.geography
    ) AS origin_distance_m,
    extensions.ST_Distance(
      r.destination_location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(dest_lng, dest_lat), 4326)::extensions.geography
    ) AS dest_distance_m
  FROM public.rides r
  JOIN public.profiles p ON p.id = r.driver_id
  LEFT JOIN public.vehicles v ON v.id = r.vehicle_id
  WHERE
    r.status = 'upcoming'
    AND r.seats_available > 0
    -- Time window: rides departing on the search date (+/- 1 day buffer)
    AND r.departure_time >= (search_date::timestamptz)
    AND r.departure_time < (search_date::timestamptz + interval '2 days')
    -- Spatial matching: route passes within radius_km of passenger's origin
    AND (
      -- If route geometry exists, use corridor matching
      (r.route_geometry IS NOT NULL AND extensions.ST_DWithin(
        r.route_geometry,
        extensions.ST_SetSRID(extensions.ST_MakePoint(origin_lng, origin_lat), 4326)::extensions.geography,
        radius_km * 1000  -- ST_DWithin uses meters for geography type
      ))
      OR
      -- Fallback to point matching if no route geometry
      (r.route_geometry IS NULL AND extensions.ST_DWithin(
        r.origin_location,
        extensions.ST_SetSRID(extensions.ST_MakePoint(origin_lng, origin_lat), 4326)::extensions.geography,
        radius_km * 1000
      ))
    )
    -- Spatial matching: route passes within radius_km of passenger's destination
    AND (
      (r.route_geometry IS NOT NULL AND extensions.ST_DWithin(
        r.route_geometry,
        extensions.ST_SetSRID(extensions.ST_MakePoint(dest_lng, dest_lat), 4326)::extensions.geography,
        radius_km * 1000
      ))
      OR
      (r.route_geometry IS NULL AND extensions.ST_DWithin(
        r.destination_location,
        extensions.ST_SetSRID(extensions.ST_MakePoint(dest_lng, dest_lat), 4326)::extensions.geography,
        radius_km * 1000
      ))
    )
  ORDER BY r.departure_time ASC
  LIMIT max_results;
$$;
```

### Pattern 3: Google Places Autocomplete (New API)

**What:** Use the new Places API `AutocompleteSuggestion.fetchAutocompleteSuggestions()` for address input, since the legacy `google.maps.places.Autocomplete` is unavailable to new customers since March 1, 2025.
**When to use:** Origin and destination input fields in ride posting form and search form.
**Confidence:** HIGH -- verified via [Google Places API migration](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new) and [visgl/react-google-maps#736](https://github.com/visgl/react-google-maps/issues/736)

```typescript
// apps/web/components/address-autocomplete.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface PlaceResult {
  lat: number;
  lng: number;
  address: string;
  placeId: string;
}

interface AddressAutocompleteProps {
  placeholder?: string;
  onPlaceSelect: (place: PlaceResult) => void;
  defaultValue?: string;
}

export function AddressAutocomplete({
  placeholder = 'Enter address',
  onPlaceSelect,
  defaultValue,
}: AddressAutocompleteProps) {
  const places = useMapsLibrary('places');
  const [inputValue, setInputValue] = useState(defaultValue ?? '');
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!places || input.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const request = {
          input,
          // Bias toward Czech Republic
          includedRegionCodes: ['cz', 'sk'],
        };

        const { suggestions } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            request,
          );
        setSuggestions(suggestions);
        setIsOpen(true);
      } catch {
        setSuggestions([]);
      }
    },
    [places],
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelect = async (
    suggestion: google.maps.places.AutocompleteSuggestion,
  ) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;

    // Fetch place details (location coordinates)
    const place = prediction.toPlace();
    await place.fetchFields({
      fields: ['location', 'formattedAddress'],
    });

    const location = place.location;
    if (location) {
      onPlaceSelect({
        lat: location.lat(),
        lng: location.lng(),
        address: place.formattedAddress ?? prediction.text.text,
        placeId: place.id,
      });
    }

    setInputValue(place.formattedAddress ?? prediction.text.text);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border-pastel px-4 py-3"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-border-pastel bg-surface shadow-lg">
          {suggestions.map((suggestion, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(suggestion)}
              className="cursor-pointer px-4 py-2 hover:bg-primary/5"
            >
              {suggestion.placePrediction?.text.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Pattern 4: Edge Function for Route Computation + Price Suggestion

**What:** A Supabase Edge Function that proxies Google Routes API to compute route distance, duration, and polyline. Also calculates suggested price. Keeps Google API key server-side.
**When to use:** Called after driver selects origin and destination in ride posting form.
**Confidence:** HIGH -- verified via [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions) and [Google Routes API](https://developers.google.com/maps/documentation/routes/compute-route-over)

```typescript
// supabase/functions/compute-route/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const GOOGLE_ROUTES_API_KEY = Deno.env.get('GOOGLE_ROUTES_API_KEY')!;
const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// Czech fuel cost constants (configurable via env)
const FUEL_PRICE_CZK_PER_LITER = parseFloat(
  Deno.env.get('FUEL_PRICE_CZK') ?? '35',
);
const AVG_FUEL_CONSUMPTION_L_PER_100KM = parseFloat(
  Deno.env.get('FUEL_CONSUMPTION') ?? '7',
);
const COST_SHARING_FACTOR = 0.6; // Driver doesn't charge full cost (shares savings)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { originLat, originLng, destLat, destLng } = await req.json();

  const response = await fetch(ROUTES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_ROUTES_API_KEY,
      'X-Goog-FieldMask':
        'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: {
        location: { latLng: { latitude: originLat, longitude: originLng } },
      },
      destination: {
        location: { latLng: { latitude: destLat, longitude: destLng } },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    }),
  });

  const data = await response.json();
  const route = data.routes?.[0];

  if (!route) {
    return new Response(JSON.stringify({ error: 'No route found' }), {
      status: 404,
    });
  }

  const distanceMeters = route.distanceMeters;
  const distanceKm = distanceMeters / 1000;
  const durationSeconds = parseInt(route.duration.replace('s', ''));
  const encodedPolyline = route.polyline.encodedPolyline;

  // Price suggestion: (distance_km / 100) * consumption * fuel_price * sharing_factor
  const fuelCost =
    (distanceKm / 100) * AVG_FUEL_CONSUMPTION_L_PER_100KM * FUEL_PRICE_CZK_PER_LITER;
  const suggestedPriceCzk = Math.round(fuelCost * COST_SHARING_FACTOR);

  return new Response(
    JSON.stringify({
      distanceMeters,
      durationSeconds,
      encodedPolyline,
      suggestedPriceCzk,
      priceMinCzk: Math.round(suggestedPriceCzk * 0.5),
      priceMaxCzk: Math.round(suggestedPriceCzk * 2.0),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
```

### Pattern 5: Ride Expiry via pg_cron

**What:** Use Supabase pg_cron to automatically expire rides whose departure time has passed.
**When to use:** Runs every hour as a scheduled job.
**Confidence:** HIGH -- verified via [Supabase Cron docs](https://supabase.com/docs/guides/cron)

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to expire past rides
CREATE OR REPLACE FUNCTION public.expire_past_rides()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.rides
  SET status = 'completed',
      updated_at = now()
  WHERE status = 'upcoming'
    AND departure_time < now() - interval '6 hours';
    -- 6-hour buffer: ride with 14:00 departure expires at 20:00
END;
$$;

-- Schedule: run every hour at minute 0
SELECT cron.schedule(
  'expire-past-rides',
  '0 * * * *',
  $$SELECT public.expire_past_rides();$$
);
```

### Pattern 6: Recurring Ride Patterns

**What:** Store a recurring pattern (day of week, time, origin/dest) and use pg_cron to auto-generate ride instances for upcoming weeks.
**When to use:** When driver creates a recurring ride pattern.
**Confidence:** MEDIUM -- pattern based on [recurring calendar events design](https://medium.com/@aureliadotlim/recurring-calendar-events-database-design-dc872fb4f2b5) and general scheduling patterns.

```sql
CREATE TABLE public.recurring_ride_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id),
  origin_location GEOGRAPHY(POINT, 4326) NOT NULL,
  origin_address TEXT NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_address TEXT NOT NULL,
  route_geometry GEOGRAPHY(LINESTRING, 4326),
  route_encoded_polyline TEXT,

  -- Recurrence pattern
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  departure_time TIME NOT NULL,        -- Time of day (without date)
  seats_total INT NOT NULL DEFAULT 4,
  price_czk NUMERIC(10,2),
  booking_mode TEXT DEFAULT 'request' CHECK (booking_mode IN ('instant', 'request')),

  -- Control
  is_active BOOLEAN DEFAULT true,
  generate_weeks_ahead INT DEFAULT 2,  -- How many weeks ahead to generate
  last_generated_date DATE,            -- Last date rides were generated through

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to auto-generate rides from patterns
CREATE OR REPLACE FUNCTION public.generate_recurring_rides()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  pattern RECORD;
  target_date DATE;
  ride_exists BOOLEAN;
BEGIN
  FOR pattern IN
    SELECT * FROM public.recurring_ride_patterns WHERE is_active = true
  LOOP
    -- Generate rides for the next N weeks
    FOR i IN 0..pattern.generate_weeks_ahead LOOP
      -- Calculate the next occurrence of the pattern's day_of_week
      target_date := CURRENT_DATE + (i * 7) +
        ((pattern.day_of_week - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7);

      -- Skip past dates
      IF target_date < CURRENT_DATE THEN
        CONTINUE;
      END IF;

      -- Check if ride already exists for this date
      SELECT EXISTS (
        SELECT 1 FROM public.rides
        WHERE recurring_pattern_id = pattern.id
          AND departure_time::date = target_date
          AND status IN ('upcoming', 'in_progress')
      ) INTO ride_exists;

      IF NOT ride_exists THEN
        INSERT INTO public.rides (
          driver_id, vehicle_id,
          origin_location, origin_address,
          destination_location, destination_address,
          route_geometry, route_encoded_polyline,
          departure_time, seats_total, seats_available,
          price_czk, booking_mode, status, recurring_pattern_id
        ) VALUES (
          pattern.driver_id, pattern.vehicle_id,
          pattern.origin_location, pattern.origin_address,
          pattern.destination_location, pattern.destination_address,
          pattern.route_geometry, pattern.route_encoded_polyline,
          target_date + pattern.departure_time,
          pattern.seats_total, pattern.seats_total,
          pattern.price_czk, pattern.booking_mode, 'upcoming',
          pattern.id
        );
      END IF;
    END LOOP;

    -- Update last_generated_date
    UPDATE public.recurring_ride_patterns
    SET last_generated_date = CURRENT_DATE + (pattern.generate_weeks_ahead * 7)
    WHERE id = pattern.id;
  END LOOP;
END;
$$;

-- Schedule: run daily at 3 AM
SELECT cron.schedule(
  'generate-recurring-rides',
  '0 3 * * *',
  $$SELECT public.generate_recurring_rides();$$
);
```

### Pattern 7: Deep Links for Ride Sharing

**What:** Ride detail pages use Next.js `generateMetadata` for Open Graph tags so shared links show rich previews. Expo handles deep links via expo-linking.
**When to use:** Every ride detail page.
**Confidence:** HIGH -- verified via [Next.js metadata docs](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) and [Expo linking docs](https://docs.expo.dev/linking/overview/)

```typescript
// apps/web/app/(app)/rides/[id]/page.tsx
import { createServerClient } from '@/lib/supabase/server';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: ride } = await supabase
    .from('rides')
    .select('*, profiles!driver_id(display_name, avatar_url)')
    .eq('id', id)
    .single();

  if (!ride) return { title: 'Ride not found' };

  const title = `${ride.origin_address} → ${ride.destination_address}`;
  const description = `${ride.price_czk} CZK · ${ride.seats_available} seats · ${new Date(ride.departure_time).toLocaleDateString()}`;

  return {
    title,
    description,
    openGraph: {
      title: `Ride: ${title}`,
      description,
      type: 'website',
      url: `https://rideshare.festapp.com/rides/${id}`,
    },
  };
}

export default async function RideDetailPage({ params }: Props) {
  // ... SSR ride detail with map, driver info, pickup points, booking action
}
```

### Anti-Patterns to Avoid

- **Point-only matching without route geometry:** Only matching origin-to-origin and dest-to-dest misses rides passing through. Store the route LINESTRING and query with `ST_DWithin` against it. (Documented in PITFALLS.md #5)
- **Calling Google APIs from client-side:** Exposes API keys. Always proxy through Edge Function for Routes API. The Maps JavaScript API key is safe to expose (restricted by referrer).
- **Unbounded search queries:** Always LIMIT results and use spatial indexes. Without LIMIT, a search over 100k rides will time out.
- **Storing ride status transitions in client code:** All status changes (upcoming -> in_progress -> completed/cancelled) should be enforced by database CHECK constraints and RLS policies, not trusted from the client.
- **Using legacy Places Autocomplete:** `google.maps.places.Autocomplete` is blocked for new customers. Must use Places API (New) with `AutocompleteSuggestion.fetchAutocompleteSuggestions()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geospatial distance calculation | Custom Haversine formula in JS | PostGIS `ST_DWithin` + `ST_Distance` | PostGIS uses spatial indexes (GIST) for O(log n) queries; hand-rolled Haversine requires full table scan |
| Route polyline decoding | Manual bit-shifting decoder | `@googlemaps/polyline-codec` | Edge cases with precision loss and negative coordinates |
| Address autocomplete | Custom geocoding + text matching | Google Places API (New) | Address databases are enormous, constantly changing, and locale-specific; Google handles this |
| Route computation | Straight-line distance approximation | Google Routes API | Actual driving distance/duration accounts for roads, traffic, one-way streets |
| Recurring schedule calculation | Custom day-of-week math | PostgreSQL `EXTRACT(DOW FROM ...)` + interval arithmetic | Database handles timezone-aware date math correctly |
| Price suggestion | Hardcoded price table per city pair | Distance-based formula via Edge Function | Scales to any route; configurable fuel cost parameters |

**Key insight:** Geospatial operations are deceptively complex. PostGIS handles projection, datum, earth curvature, and index optimization that would take weeks to hand-roll and would still be slower.

## Common Pitfalls

### Pitfall 1: PostGIS Schema Prefix in Supabase
**What goes wrong:** PostGIS functions fail with "function not found" errors.
**Why it happens:** In Supabase, PostGIS is installed in the `extensions` schema, not `public`. All PostGIS function calls must be prefixed with `extensions.` (e.g., `extensions.ST_DWithin(...)` not `ST_DWithin(...)`).
**How to avoid:** Always use `extensions.` prefix in SQL migrations and RPC functions. Set `search_path` correctly in functions.
**Warning signs:** "function st_dwithin does not exist" errors.

### Pitfall 2: Geography vs Geometry Type Confusion
**What goes wrong:** Distances come back in wrong units (degrees instead of meters) or queries don't use spatial indexes.
**Why it happens:** PostGIS has two types: `geometry` (planar, units depend on SRID) and `geography` (spheroidal, always meters). If you use `geometry(POINT, 4326)`, `ST_DWithin` returns distances in degrees. With `geography(POINT, 4326)`, distances are in meters.
**How to avoid:** Always use `GEOGRAPHY` type (not GEOMETRY) for lat/lng data. `ST_DWithin` on geography takes meters as the distance parameter.
**Warning signs:** Search radius of 15 returning rides 15 degrees away (thousands of km).

### Pitfall 3: Google Places API Session Pricing
**What goes wrong:** Autocomplete costs 10x more than expected.
**Why it happens:** Without session tokens, each keystroke is billed as a separate request. With sessions, up to 12 requests are bundled into one billing event. The Places API (New) handles sessions differently than the legacy API.
**How to avoid:** Use the session-based pricing model. With the new `AutocompleteSuggestion.fetchAutocompleteSuggestions()`, Google manages sessions automatically when you follow the recommended pattern (autocomplete -> place details in one flow).
**Warning signs:** Unexpectedly high Google Maps billing.

### Pitfall 4: Ride Search Time Window
**What goes wrong:** User searches for rides on "Friday" but misses rides departing at 6 AM because the search uses midnight-to-midnight.
**Why it happens:** Timezone handling. A ride with `departure_time = '2026-02-20T06:00:00+01:00'` (CET) stored as UTC is `'2026-02-20T05:00:00Z'`. If the search date is parsed in UTC, early morning CET rides might fall on the previous UTC day.
**How to avoid:** Search with a generous time window (search_date to search_date + 2 days). Let the client filter/sort by exact time. Store all times as TIMESTAMPTZ (which Supabase does by default).
**Warning signs:** Users reporting "I know there's a ride but I can't find it."

### Pitfall 5: N+1 Query on Ride Search Results
**What goes wrong:** Search results page is slow because driver profile and vehicle info are fetched separately for each ride.
**Why it happens:** Fetching rides then looping to fetch each driver's profile and vehicle.
**How to avoid:** Use JOIN in the `nearby_rides` RPC function (as shown in Pattern 2) to return all needed data in a single query. Never fetch related data in a loop.
**Warning signs:** Search results taking 2-5 seconds to load.

### Pitfall 6: Route Geometry Size
**What goes wrong:** Route LINESTRING for long routes (e.g., Prague-Brno, 250km) can have hundreds of points, making the geography column large.
**Why it happens:** Google Routes API returns detailed polylines with many points for accuracy.
**How to avoid:** Simplify the polyline before storing. PostGIS `ST_Simplify` can reduce point count while preserving shape. For matching purposes, a simplified line is sufficient. Store the original encoded polyline separately for display.
**Warning signs:** Rides table growing unusually large; slow inserts.

## Code Examples

### Calling nearby_rides RPC from client
```typescript
// packages/shared/src/queries/search.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export interface SearchParams {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  searchDate: string;  // ISO date string
  radiusKm?: number;
  maxResults?: number;
}

export function searchNearbyRides(
  client: SupabaseClient<Database>,
  params: SearchParams,
) {
  return client.rpc('nearby_rides', {
    origin_lat: params.originLat,
    origin_lng: params.originLng,
    dest_lat: params.destLat,
    dest_lng: params.destLng,
    search_date: params.searchDate,
    radius_km: params.radiusKm ?? 15,
    max_results: params.maxResults ?? 50,
  });
}
```

### Price suggestion constants
```typescript
// packages/shared/src/constants/pricing.ts
export const PRICING = {
  // Czech fuel costs (updated periodically)
  FUEL_PRICE_CZK_PER_LITER: 35,       // ~35 CZK/L average in CZ (late 2025)
  AVG_CONSUMPTION_L_PER_100KM: 7,      // Average car fuel consumption

  // Price bounds (driver can adjust within these)
  COST_SHARING_FACTOR: 0.6,            // Suggested price = 60% of fuel cost
  MIN_PRICE_FACTOR: 0.5,               // Min = 50% of suggested
  MAX_PRICE_FACTOR: 2.0,               // Max = 200% of suggested
  MIN_PRICE_CZK: 20,                   // Absolute minimum price

  // Currency
  CURRENCY: 'CZK',
  CURRENCY_SYMBOL: 'Kc',
} as const;

export function calculateSuggestedPrice(distanceMeters: number): {
  suggested: number;
  min: number;
  max: number;
} {
  const distanceKm = distanceMeters / 1000;
  const fuelCost =
    (distanceKm / 100) *
    PRICING.AVG_CONSUMPTION_L_PER_100KM *
    PRICING.FUEL_PRICE_CZK_PER_LITER;
  const suggested = Math.max(
    PRICING.MIN_PRICE_CZK,
    Math.round(fuelCost * PRICING.COST_SHARING_FACTOR),
  );

  return {
    suggested,
    min: Math.max(PRICING.MIN_PRICE_CZK, Math.round(suggested * PRICING.MIN_PRICE_FACTOR)),
    max: Math.round(suggested * PRICING.MAX_PRICE_FACTOR),
  };
}
```

### Ride Zod validation schema
```typescript
// packages/shared/src/validation/ride.ts
import { z } from 'zod';

export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(1).max(500),
  placeId: z.string().optional(),
});

export const CreateRideSchema = z.object({
  origin: LocationSchema,
  destination: LocationSchema,
  departureTime: z.string().datetime(),
  seatsTotal: z.number().int().min(1).max(8),
  priceCzk: z.number().min(0).max(10000).optional(),
  luggageSize: z.enum(['none', 'small', 'medium', 'large']).default('medium'),
  bookingMode: z.enum(['instant', 'request']).default('request'),
  preferences: z.object({
    smoking: z.boolean().default(false),
    pets: z.boolean().default(false),
    music: z.boolean().default(true),
    chat: z.boolean().default(true),
  }).optional(),
  notes: z.string().max(500).optional(),
  vehicleId: z.string().uuid().optional(),
});

export const UpdateRideSchema = CreateRideSchema.partial().extend({
  id: z.string().uuid(),
});

export const SearchRidesSchema = z.object({
  origin: LocationSchema,
  destination: LocationSchema,
  date: z.string().date(),
  radiusKm: z.number().min(1).max(100).default(15),
});

export type Location = z.infer<typeof LocationSchema>;
export type CreateRide = z.infer<typeof CreateRideSchema>;
export type UpdateRide = z.infer<typeof UpdateRideSchema>;
export type SearchRides = z.infer<typeof SearchRidesSchema>;
```

### Favorite routes table and schema
```sql
CREATE TABLE public.favorite_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin_location GEOGRAPHY(POINT, 4326) NOT NULL,
  origin_address TEXT NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_address TEXT NOT NULL,
  label TEXT,                          -- User-defined label, e.g., "Home to Work"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, origin_address, destination_address)
);

ALTER TABLE public.favorite_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorite routes"
  ON public.favorite_routes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `google.maps.places.Autocomplete` | `AutocompleteSuggestion.fetchAutocompleteSuggestions()` | March 1, 2025 | Legacy blocked for new customers; new API is programmatic (no widget), giving full UI control |
| Google Directions API | Google Routes API (`computeRoutes`) | March 1, 2025 | Directions API is now "Legacy"; Routes API is the replacement with same functionality + traffic routing |
| $200/month Google Maps credit | Free tier per SKU (10,000 events/month Essentials) | March 1, 2025 | Better for low-volume apps; 10K free autocomplete requests/month is generous for a community app |
| PostGIS point-only matching | Route corridor matching with LINESTRING | Ongoing best practice | BlaBlaCar-style matching finds rides passing through, not just same origin/dest |
| Manual ride expiry (client-side check) | pg_cron scheduled job | Supabase Cron module (2024) | Automatic, reliable, no client dependency |

**Deprecated/outdated:**
- `google.maps.places.Autocomplete` -- blocked for new customers since March 2025, use Places API (New)
- `google.maps.DirectionsService` -- use Routes API `computeRoutes` instead
- Distance Matrix API -- replaced by Routes API `computeRouteMatrix`
- `PlaceAutocompleteElement` -- only available in alpha/beta channels, not stable; use `AutocompleteSuggestion` programmatically instead

## Google Maps API Pricing Impact

**Free tier (Essentials, 10,000 events/month per SKU):**
| SKU | Free Events/Month | Est. Cost After Free | Phase 3 Usage Pattern |
|-----|-------------------|---------------------|-----------------------|
| Places Autocomplete (New) | 10,000 | ~$2.83/1K requests | ~4-8 requests per ride post/search (debounced) |
| Routes API Compute Routes (Basic) | 10,000 | ~$5/1K requests | 1 request per ride post |
| Maps JavaScript API Map Loads | 10,000 | ~$7/1K loads | 1 per search results page, 1 per ride detail |

**Estimated monthly cost at 500 active users:** Well within free tier. At 2,000+ active users, expect $10-30/month for Google Maps APIs.

## Open Questions

1. **Route simplification threshold**
   - What we know: `ST_Simplify` can reduce LINESTRING point count
   - What's unclear: Optimal tolerance value that preserves matching accuracy while reducing storage
   - Recommendation: Start with tolerance of 0.001 (approx 100m) and test with real Czech routes (Prague-Brno)

2. **PlaceAutocompleteElement stability**
   - What we know: Google's new web component is alpha/beta only as of Feb 2026
   - What's unclear: When it will reach stable release
   - Recommendation: Use `AutocompleteSuggestion.fetchAutocompleteSuggestions()` programmatic approach (stable, works now)

3. **Recurring rides -- timezone handling**
   - What we know: Czech Republic uses CET (UTC+1) / CEST (UTC+2) with DST
   - What's unclear: How to handle DST transition for recurring rides (a "Friday 8:00" ride should stay at 8:00 local time even when clocks change)
   - Recommendation: Store `departure_time` as TIME without timezone in the pattern table; combine with date and timezone at generation time using `AT TIME ZONE 'Europe/Prague'`

4. **Search radius default**
   - What we know: BlaBlaCar uses variable radius based on route length
   - What's unclear: Optimal default for Czech inter-city routes
   - Recommendation: Start with 15km default; allow user to expand to 30km if no results found; test with real Prague-Brno corridor data

## Sources

### Primary (HIGH confidence)
- [Supabase PostGIS docs](https://supabase.com/docs/guides/database/extensions/postgis) -- geography types, RPC functions, GIST indexes, nearby query patterns
- [PostGIS ST_DWithin reference](https://postgis.net/docs/ST_DWithin.html) -- distance function behavior with geography type (meters)
- [PostGIS spatial queries](https://postgis.net/docs/using_postgis_query.html) -- `<->` operator, bounding box queries, index usage
- [Google Places API (New) migration](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new) -- PlaceAutocompleteElement, fetchAutocompleteSuggestions
- [visgl/react-google-maps#736](https://github.com/visgl/react-google-maps/issues/736) -- Legacy Autocomplete blocked March 2025, migration guidance
- [visgl/react-google-maps autocomplete example](https://visgl.github.io/react-google-maps/examples/autocomplete) -- Working code examples with new API
- [Google Routes API](https://developers.google.com/maps/documentation/routes/compute-route-over) -- computeRoutes endpoint, field masks, polyline encoding
- [Google Maps pricing March 2025](https://developers.google.com/maps/billing-and-pricing/march-2025) -- Free tier per SKU structure
- [Supabase Cron docs](https://supabase.com/docs/guides/cron) -- pg_cron scheduling, job management
- [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions) -- Deno runtime, env vars, deployment
- [Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) -- Dynamic Open Graph tags for SSR pages
- [Expo linking overview](https://docs.expo.dev/linking/overview/) -- Deep links, universal links, app links

### Secondary (MEDIUM confidence)
- [BlaBlaCar matching blog](https://medium.com/blablacar/improving-the-matching-performance-for-carpooling-4383a37a9c18) -- Two-phase matching (PostGIS gross match + detour calc)
- [Routes API pricing](https://developers.google.com/maps/documentation/routes/usage-and-billing) -- $5/1K basic, $10/1K advanced, $15/1K preferred
- [Czech fuel prices](https://www.globalpetrolprices.com/Czech-Republic/gasoline_prices/) -- ~35 CZK/L average gasoline price (late 2025)
- [Czech mileage rates](https://www.travelperk.com/uk/blog/mileage-reimbursement-czech-republic/) -- Official CZ mileage allowance rates

### Tertiary (LOW confidence)
- [Recurring calendar events DB design](https://medium.com/@aureliadotlim/recurring-calendar-events-database-design-dc872fb4f2b5) -- Pattern storage + instance generation approach (single source, couldn't verify)
- [Ride matching with PostGIS](https://medium.com/@deepdeepak2222/how-to-implement-a-ride-matching-system-using-postgres-postgis-and-python-93cdcc5d0d55) -- General approach (couldn't access full article)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified via official docs, version pinned
- Architecture (PostGIS/search): HIGH -- PostGIS patterns verified via official docs, BlaBlaCar approach documented
- Architecture (Google APIs): HIGH -- pricing and API changes verified via official Google docs
- Pitfalls: HIGH -- PostGIS gotchas verified, pricing gotchas documented by Google
- Recurring rides: MEDIUM -- pattern is sound but based on general scheduling design, not ride-specific verified source
- Price algorithm: MEDIUM -- fuel prices verified, but formula is custom (no standard exists for CZ carpooling)

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (Google API pricing/availability may change; fuel prices fluctuate)
