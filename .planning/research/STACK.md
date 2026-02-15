# Stack Research

**Domain:** Ride-sharing / carpooling platform
**Researched:** 2026-02-15
**Confidence:** HIGH

## Core Stack (Pre-decided)

These decisions are already made. Documenting for reference and version pinning only.

| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| Supabase | latest | Backend (PostgreSQL, Auth, Realtime, Edge Functions, Storage) | Hosted BaaS -- no server to manage |
| @supabase/supabase-js | ^2.95 | JavaScript client for Supabase | Dropped Node 18 support in 2.79; use Node 20+ |
| @supabase/ssr | ^0.8.0 | Next.js server-side auth (cookies) | Replaces deprecated @supabase/auth-helpers-* |
| Next.js | ^16.1 | Web frontend | App Router, Turbopack default, React 19 |
| Expo (React Native) | SDK 54 (~54.0) | Mobile app (iOS + Android) | React Native 0.81, React 19.1, New Architecture only |
| TypeScript | ^5.7 | Language across all packages | Strict mode enabled |
| Turborepo | ^2.8 | Monorepo build orchestration | Rust-based, composable config since 2.7 |

## Recommended Stack

### Monorepo Structure

| Package | Purpose | Why |
|---------|---------|-----|
| `apps/web` | Next.js 16 web app | App Router with SSR/SSG for SEO (ride listings) |
| `apps/mobile` | Expo SDK 54 mobile app | Primary interface for drivers/passengers on the go |
| `packages/shared` | Zod schemas, TypeScript types, constants | Single source of truth for data contracts -- validated identically on web, mobile, and Edge Functions |
| `packages/supabase` | Supabase client factory, typed queries, RLS helpers | Centralized DB access; generate types from Supabase CLI |
| `packages/ui` | Shared React Native + Web components (via NativeWind) | Code reuse for common UI patterns across platforms |
| `packages/config-ts` | Shared tsconfig | Consistent compiler settings |
| `packages/config-eslint` | Shared ESLint config | Consistent linting |

**Package manager:** Use **pnpm** because Turborepo works best with pnpm workspaces, and pnpm's strict dependency resolution prevents phantom dependency issues that plague monorepos.

### Shared Validation and Types

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| zod | ^4.3 | Schema validation + type inference | Single schema definition produces both runtime validation and TypeScript types via `z.infer<>`. Works identically on web, mobile, and Edge Functions. Zod 4 has major perf improvements over v3. |
| @supabase/supabase-js | ^2.95 | Generated database types | Run `supabase gen types typescript` to generate types from your database schema, then wrap with Zod schemas in `packages/shared` |

### Data Fetching and State Management

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| @tanstack/react-query | ^5.90 | Server state management | Industry standard. Handles caching, background refetching, optimistic updates. Works on both React (web) and React Native (mobile). |
| @supabase-cache-helpers/postgrest-react-query | ^1.3 | Supabase + TanStack Query bridge | Automatically generates unique query keys from Supabase queries, populates cache on mutations. Eliminates manual cache key management. |

**Pattern for Realtime:** Use Supabase Realtime subscriptions to **invalidate** TanStack Query caches rather than replacing TanStack Query with raw subscriptions. Supabase Realtime sends change events (not full state), so TanStack Query refetches the current data on invalidation. This keeps your data layer consistent and gives you offline support, retry logic, and devtools for free.

### Maps and Location

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| react-native-maps | ^1.27 | Maps on mobile (iOS + Android) | Mature, well-maintained, Expo-compatible. Uses Google Maps on Android, Apple Maps or Google Maps on iOS. New Architecture supported. |
| @vis.gl/react-google-maps | latest | Maps on web (Next.js) | Official Google Maps React wrapper for web. Separate from mobile maps -- web and mobile map implementations will differ. |
| expo-location | ~18.0 (SDK 54 compatible) | Foreground + background location | Built into Expo, handles permissions, GPS tracking. Combine with expo-task-manager for background location updates. |
| expo-task-manager | ~12.0 (SDK 54 compatible) | Background tasks (location tracking) | Required for tracking driver location when app is backgrounded. |

**Maps decision: Use Google Maps, not MapLibre.** Rationale:
- Google Maps has the best geocoding, routing, and place search APIs -- critical for a ride-sharing app that needs address autocomplete, route display, and ETA calculation
- react-native-maps with Google Maps provider is battle-tested in production ride-sharing apps
- MapLibre requires separate web (react-map-gl) and native (maplibre-react-native) implementations with different APIs -- more complexity for no clear benefit
- Google Maps free tier (200 USD/month credit) is sufficient for a donation-based community app
- Downside: vendor lock-in to Google. Acceptable tradeoff for a community project.

### Styling

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| NativeWind | ^4.1 (stable) | Tailwind CSS for React Native | Write Tailwind classes that work on both web and mobile. Enables shared UI components in `packages/ui`. v4.1 is stable; v5 is pre-release -- do NOT use v5 yet. |
| Tailwind CSS | ^3.4 | CSS utility framework | Required by NativeWind v4. Do NOT upgrade to Tailwind v4 yet -- NativeWind v4 requires Tailwind v3. |
| tailwindcss (web only) | ^4.1 | Tailwind for Next.js web app | The web app can use Tailwind v4 independently since Next.js does not go through NativeWind. |

**Important version constraint:** NativeWind v4.1 requires Tailwind CSS v3.x. NativeWind v5 (pre-release) requires Tailwind v4.1+. Stick with v4.1 + Tailwind v3 for mobile/shared packages. The web app (`apps/web`) can independently use Tailwind v4 since it does not use NativeWind.

### Forms

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| react-hook-form | ^7.54 | Form state management | Smallest re-render footprint of any form library. Works on both React and React Native. Critical for mobile where re-renders cost more. |
| @hookform/resolvers | ^3.9 | Zod resolver for react-hook-form | Connects Zod schemas (from `packages/shared`) to form validation. One schema validates on both web and mobile. |

### Chat / Messaging

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| react-native-gifted-chat | ^3.3 | Chat UI components (mobile) | Most complete chat UI for React Native. Typing indicators, quick replies, swipe-to-reply. Still actively maintained (latest: 14 days ago). |

**Chat backend:** Use Supabase Realtime + PostgreSQL tables. No need for a separate chat service. Store messages in a `messages` table with RLS policies, subscribe to inserts via Supabase Realtime channels. This keeps the stack simple and avoids third-party chat SDK costs.

### Push Notifications

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| expo-notifications | ~0.30 (SDK 54 compatible) | Push notification handling (mobile) | Handles FCM (Android) and APNs (iOS) behind a unified API. Works with Expo Push Service for simplified token management. |
| expo-task-manager | ~12.0 | Background notification processing | Required for handling notifications when app is backgrounded/closed. |

**Notification trigger:** Use Supabase Database Webhooks or Edge Functions. When a ride is booked, a database trigger calls an Edge Function that sends push notifications via Expo Push API. No separate notification service needed.

### Navigation

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| expo-router | ^4.0 (SDK 54) | File-based routing for mobile | Built into Expo SDK 54. File-system routing mirrors Next.js patterns, reducing cognitive overhead when working across web and mobile. |

### Animation and Gestures

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| react-native-reanimated | ^4.2 | Performant animations (mobile) | Required by NativeWind for transitions. Runs animations on UI thread for 60fps. New Architecture only (which SDK 54 enforces). |
| react-native-gesture-handler | ^2.24 | Touch gesture handling (mobile) | Swipe-to-reply in chat, pull-to-refresh on ride lists, map gesture handling. |

### Date/Time

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| date-fns | ^4.1 | Date formatting and manipulation | Tree-shakeable (only import what you use), functional API, works on web + mobile + Edge Functions. Avoid dayjs -- its chainable API causes issues with tree-shaking in monorepo setups. |

### Image Handling

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| expo-image | ~2.0 (SDK 54) | Optimized image loading (mobile) | Built on native image libraries, supports blurhash placeholders, caching. Far better than React Native's built-in Image component. |

### Secure Storage

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| expo-secure-store | ~14.0 (SDK 54) | Encrypted key-value storage | Stores Supabase auth tokens securely on device. Required for production auth -- AsyncStorage is not encrypted. |
| @react-native-async-storage/async-storage | ^2.1 | General-purpose async storage | For non-sensitive data (user preferences, cached ride data). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase CLI | Local development, DB migrations, type generation | `supabase start` for local Postgres + Auth + Realtime. `supabase gen types typescript` for type generation. |
| Turborepo | Build orchestration, caching | `turbo run build` caches across packages. `turbo run dev` starts all apps. |
| pnpm | Package manager | Strict dependency resolution, fast installs, workspace protocol. |
| Biome | Linter + formatter | Faster than ESLint + Prettier combined. Turborepo 2.7+ has a Biome rule for unsafe env vars. Consider as ESLint alternative. |
| ESLint + Prettier | Linting + formatting (alternative) | More ecosystem support than Biome, but slower. Use if team prefers established tooling. |
| TypeScript strict mode | Type safety | `"strict": true` in shared tsconfig. Non-negotiable for a monorepo. |

## Installation

```bash
# Initialize monorepo
pnpm init
npx create-turbo@latest

# Apps
cd apps/web && npx create-next-app@latest --typescript
cd apps/mobile && npx create-expo-app@latest --template expo-template-blank-typescript

# Core shared dependencies (in packages/shared)
pnpm add zod @supabase/supabase-js

# Web-specific (in apps/web)
pnpm add @supabase/ssr @tanstack/react-query @vis.gl/react-google-maps
pnpm add -D tailwindcss

# Mobile-specific (in apps/mobile)
pnpm add @tanstack/react-query react-native-maps expo-location expo-task-manager
pnpm add expo-notifications expo-secure-store expo-image
pnpm add react-native-gifted-chat react-native-reanimated react-native-gesture-handler
pnpm add nativewind
pnpm add -D tailwindcss@3

# Shared data layer (in packages/supabase)
pnpm add @supabase/supabase-js @supabase-cache-helpers/postgrest-react-query @tanstack/react-query

# Forms (shared between web and mobile)
pnpm add react-hook-form @hookform/resolvers

# Date utilities (shared)
pnpm add date-fns

# Dev tools (root)
pnpm add -D turbo supabase typescript
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Google Maps | MapLibre | If Google Maps costs become prohibitive (unlikely for community app with free tier). MapLibre requires more setup and has weaker geocoding/routing. |
| TanStack Query | SWR | Never for this project. TanStack Query has better React Native support, devtools, and mutation handling. |
| NativeWind v4 | Tamagui | If you need a full design system with built-in components. NativeWind is lighter and more flexible for custom designs. |
| NativeWind v4 | StyleSheet.create | If you want zero dependencies. But loses code sharing with web Tailwind classes. |
| react-hook-form | Formik | If team is already familiar with Formik. But Formik has more re-renders and larger bundle. |
| date-fns | dayjs | If you prefer Moment.js-like chainable API. But dayjs tree-shakes worse in monorepos. |
| Supabase Realtime (chat) | Stream Chat SDK | If you need advanced chat features (threads, reactions, read receipts) out of the box. But adds $99+/month cost and external dependency. |
| Biome | ESLint + Prettier | If team needs ESLint plugins (accessibility, React-specific rules). Biome is faster but has smaller plugin ecosystem. |
| pnpm | yarn | If team prefers yarn. But pnpm has better monorepo support and stricter dependency resolution. |
| Expo Push Service | Firebase Cloud Messaging directly | If you need topic-based messaging or advanced analytics. Expo Push wraps FCM/APNs with a simpler API. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @supabase/auth-helpers-nextjs | Deprecated. No longer receiving bug fixes. | @supabase/ssr |
| Moment.js | Enormous bundle (330KB), mutable API, officially in maintenance mode | date-fns |
| NativeWind v5 | Pre-release, requires Tailwind v4, not stable for production | NativeWind v4.1 |
| Expo SDK 52/53 | SDK 54 is current stable with RN 0.81 + React 19.1 | Expo SDK 54 |
| Redux / Zustand for server state | Unnecessary complexity when TanStack Query handles server state | @tanstack/react-query |
| Socket.io for realtime | Adds another server dependency when Supabase Realtime is built-in | Supabase Realtime channels |
| Firebase (as backend) | Conflicts with Supabase. Don't split backend across two BaaS platforms. | Supabase for everything |
| react-native-background-geolocation (transistorsoft) | Commercial license required for production. Expensive for a free/donation-based app. | expo-location + expo-task-manager |
| Tailwind CSS v4 for mobile | NativeWind v4.1 requires Tailwind v3. Using v4 will break NativeWind. | Tailwind CSS v3.x for packages using NativeWind |
| Next.js Pages Router | Legacy pattern. App Router is the future with RSC, streaming, and better data fetching. | Next.js App Router |
| AsyncStorage for auth tokens | Not encrypted. Security risk for storing sensitive authentication data. | expo-secure-store |

## Version Compatibility Matrix

| Package | Compatible With | Critical Notes |
|---------|-----------------|----------------|
| Expo SDK 54 | React Native 0.81, React 19.1 | New Architecture only (legacy dropped in SDK 55) |
| NativeWind 4.1 | Tailwind CSS 3.x, RN 0.81 | Do NOT use Tailwind v4 with NativeWind v4 |
| react-native-reanimated 4.x | RN 0.81+, New Architecture only | Required by NativeWind for animations |
| @supabase/supabase-js 2.95 | Node 20+, Deno (Edge Functions) | Node 18 support dropped in 2.79 |
| @supabase/ssr 0.8 | Next.js 14+, 15, 16 | Works with App Router and Pages Router |
| @tanstack/react-query 5.x | React 18+, React 19 | Same version works on web and mobile |
| Zod 4.x | TypeScript 5.5+ | Major API changes from Zod 3 -- do not mix versions |
| react-native-maps 1.27 | Expo SDK 54, New Architecture | Use `npx expo install` for correct version |
| Turborepo 2.8 | pnpm 9+, Node 20+ | Composable config available since 2.7 |

## Stack Patterns

**If adding a new shared package:**
- Create it under `packages/` with its own `package.json` and `tsconfig.json`
- Reference it via pnpm workspace protocol: `"@festapp/shared": "workspace:*"`
- Add it to `turbo.json` pipeline if it has build steps

**If sharing code between web and mobile:**
- Put it in `packages/shared` (logic) or `packages/ui` (components)
- Use NativeWind classes so styles work on both platforms
- Test on both platforms -- React Native does not support all web APIs

**If adding a Supabase Edge Function:**
- Write in TypeScript (Deno runtime)
- Import Zod schemas from `packages/shared` for request validation
- Deploy with `supabase functions deploy`

## Sources

- [Expo SDK 54 changelog](https://expo.dev/changelog/sdk-54) -- SDK features, RN 0.81, React 19.1 (HIGH confidence)
- [Expo documentation: monorepos](https://docs.expo.dev/guides/monorepos/) -- Monorepo setup guidance (HIGH confidence)
- [NativeWind installation docs](https://www.nativewind.dev/docs/getting-started/installation) -- v4.1 stable, v5 pre-release (HIGH confidence)
- [Supabase SSR docs](https://supabase.com/docs/guides/auth/server-side/nextjs) -- @supabase/ssr setup for Next.js (HIGH confidence)
- [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions) -- Deno runtime, push notification patterns (HIGH confidence)
- [Supabase React Native quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) -- expo-secure-store setup (HIGH confidence)
- [TanStack Query npm](https://www.npmjs.com/package/@tanstack/react-query) -- v5.90, latest version (HIGH confidence)
- [Zod npm](https://www.npmjs.com/package/zod) -- v4.3, latest version (HIGH confidence)
- [react-native-maps npm](https://www.npmjs.com/package/react-native-maps) -- v1.27, Expo compatibility (HIGH confidence)
- [Supabase cache helpers docs](https://supabase-cache-helpers.vercel.app/) -- TanStack Query integration (MEDIUM confidence)
- [Next.js 16 blog post](https://nextjs.org/blog/next-16) -- App Router, Turbopack default (HIGH confidence)
- [Turborepo 2.7 blog](https://turborepo.dev/blog/turbo-2-7) -- Devtools, composable config (HIGH confidence)
- [react-native-reanimated npm](https://www.npmjs.com/package/react-native-reanimated) -- v4.2, New Architecture only (HIGH confidence)
- [expo-location docs](https://docs.expo.dev/versions/latest/sdk/location/) -- Background location with task manager (HIGH confidence)
- [Supabase push notifications guide](https://supabase.com/docs/guides/functions/examples/push-notifications) -- Edge Function + Expo Push pattern (HIGH confidence)
- [MapLibre React Native GitHub](https://github.com/maplibre/maplibre-react-native) -- v10, New Architecture compatible (MEDIUM confidence)
- [react-native-gifted-chat npm](https://www.npmjs.com/package/react-native-gifted-chat) -- v3.3, actively maintained (HIGH confidence)

---
*Stack research for: Festapp Rideshare*
*Researched: 2026-02-15*
