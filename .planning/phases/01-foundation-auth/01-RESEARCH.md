# Phase 1: Foundation & Auth - Research

**Researched:** 2026-02-15
**Domain:** Monorepo scaffolding, Supabase Auth (phone/email/social), App shell & navigation, Design system
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire project foundation: a Turborepo monorepo with pnpm workspaces, Supabase project with auth schema, authentication flows (phone OTP via AWS SNS, email, Google, Apple), app shell with bottom tab navigation, and a pastel design system. The phase covers five plans spanning monorepo scaffolding, database setup, auth flows, navigation/design, and onboarding.

The key technical challenges are: (1) making pnpm work with Expo in a monorepo (requires `node-linker=hoisted` in .npmrc), (2) implementing a custom Supabase Auth SMS hook to route OTPs through AWS SNS, (3) handling platform differences between Next.js cookie-based auth and Expo token-based auth, and (4) managing the NativeWind v4 / Tailwind v3 version constraint for mobile while using Tailwind v4 for web.

**Primary recommendation:** Start with monorepo scaffolding + shared package, then database schema + auth, then platform-specific auth implementations (web and mobile can be parallelized), then navigation/design, then onboarding skeleton.

## Standard Stack

### Core (Phase 1 Specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Turborepo | ^2.8 | Monorepo build orchestration | Rust-based, composable config since 2.7, pnpm-native |
| pnpm | ^9 | Package manager | Strict dependency resolution, workspace protocol, best Turborepo integration |
| Next.js | ^16.1 | Web app (App Router) | SSR, Turbopack default, React 19 |
| Expo SDK | 54 | Mobile app (iOS + Android) | RN 0.81, React 19.1, New Architecture only, auto monorepo Metro config |
| TypeScript | ^5.7 | Language | Strict mode across all packages |
| @supabase/supabase-js | ^2.95 | Supabase client | Node 20+ required (dropped Node 18 in 2.79) |
| @supabase/ssr | ^0.8.0 | Next.js server-side auth (cookies) | Replaces deprecated @supabase/auth-helpers-nextjs |
| Zod | ^4.3 | Shared validation schemas | Runtime validation + TypeScript inference via z.infer |
| expo-router | ^4.0 | File-based navigation (mobile) | Built into SDK 54, mirrors Next.js App Router patterns |
| expo-secure-store | ~14.0 | Encrypted key-value storage (mobile) | Auth token encryption key storage (2048-byte limit -- use with LargeSecureStore adapter) |
| NativeWind | ^4.2 | Tailwind CSS for React Native | v4.2+ required for SDK 54 + Reanimated v4. Requires Tailwind v3.x |
| tailwindcss | ^3.4 | Tailwind for mobile/shared (NativeWind) | Required by NativeWind v4. Do NOT use v4 with NativeWind |
| tailwindcss | ^4.1 | Tailwind for web (Next.js only) | Web app uses Tailwind v4 independently |
| react-hook-form | ^7.54 | Form state management | Minimal re-renders, works on React + React Native |
| @hookform/resolvers | ^3.9 | Zod resolver for react-hook-form | Connects shared Zod schemas to form validation |

### Supporting (Phase 1)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-native-async-storage/async-storage | ^2.1 | Async storage for encrypted session data | Used by LargeSecureStore adapter for storing encrypted session (expo-secure-store stores only the AES key) |
| aes-js | ^3.1 | AES encryption for session storage | Used in LargeSecureStore to encrypt session data before storing in AsyncStorage |
| react-native-get-random-values | latest | Crypto polyfill for React Native | Required for crypto.getRandomValues in LargeSecureStore |
| react-native-reanimated | ^4.2 | Animations | Required by NativeWind v4. New Architecture only. |
| react-native-safe-area-context | latest | Safe area insets | Required by NativeWind and expo-router |
| @expo/vector-icons | latest | Tab bar icons | Built into Expo, used for navigation icons |
| @invertase/react-native-apple-authentication | latest | Apple Sign In (native) | Required for native Apple auth on iOS/Android |
| @react-oauth/google | latest | Google Sign In (web) | Required for Google auth on Next.js web app |
| Supabase CLI | latest | Local dev, migrations, type gen | `supabase init`, `supabase start`, `supabase gen types typescript` |
| AWS SDK (SNS) | v3 | SMS sending | Used in Edge Function for phone OTP delivery |

### What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @supabase/auth-helpers-nextjs | Deprecated, no longer maintained | @supabase/ssr |
| NativeWind v5 | Pre-release, requires Tailwind v4 | NativeWind v4.2+ |
| Tailwind v4 with NativeWind | Breaks NativeWind v4 | Tailwind v3.4 for mobile packages |
| expo-secure-store alone for sessions | 2048-byte limit; Supabase sessions exceed this | LargeSecureStore adapter (AES key in SecureStore, encrypted data in AsyncStorage) |
| expo-sqlite/localStorage for auth | Not encrypted; less secure than LargeSecureStore | LargeSecureStore with AES encryption |
| getSession() on server | Not authenticated; can be tampered with | getClaims() (validates JWT via JWKS) or getUser() (network request to auth server) |

**Installation (Phase 1):**
```bash
# Root
pnpm add -D turbo typescript supabase

# packages/shared
pnpm add zod @supabase/supabase-js

# apps/web
pnpm add @supabase/supabase-js @supabase/ssr @react-oauth/google react-hook-form @hookform/resolvers
pnpm add -D tailwindcss@latest  # v4 for web

# apps/mobile
pnpm add @supabase/supabase-js expo-secure-store @react-native-async-storage/async-storage
pnpm add aes-js react-native-get-random-values
pnpm add react-hook-form @hookform/resolvers
pnpm add nativewind react-native-reanimated react-native-safe-area-context
pnpm add @invertase/react-native-apple-authentication
pnpm add -D tailwindcss@3  # v3 for NativeWind
```

## Architecture Patterns

### Recommended Project Structure (Phase 1)

```
festapp-rideshare/
├── apps/
│   ├── web/                          # Next.js 16 App Router
│   │   ├── app/
│   │   │   ├── (auth)/              # Auth routes (login, signup, reset-password)
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── signup/page.tsx
│   │   │   │   └── layout.tsx       # Unauth layout (redirect if logged in)
│   │   │   ├── (app)/              # Authenticated app shell
│   │   │   │   ├── search/page.tsx  # NAV-01: Search tab
│   │   │   │   ├── my-rides/page.tsx # NAV-01: My Rides tab
│   │   │   │   ├── messages/page.tsx # NAV-01: Messages tab
│   │   │   │   ├── profile/page.tsx  # NAV-01: Profile tab
│   │   │   │   ├── settings/page.tsx # NAV-06: Settings
│   │   │   │   └── layout.tsx       # Authenticated layout with nav
│   │   │   ├── auth/
│   │   │   │   └── callback/route.ts # OAuth callback handler
│   │   │   └── layout.tsx           # Root layout with providers
│   │   ├── lib/
│   │   │   └── supabase/
│   │   │       ├── server.ts        # createServerClient (SSR)
│   │   │       ├── client.ts        # createBrowserClient
│   │   │       └── middleware.ts    # Token refresh logic
│   │   ├── middleware.ts            # Next.js middleware
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts       # Tailwind v4 config
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                      # Expo SDK 54
│       ├── app/
│       │   ├── (auth)/              # Auth screens (unauth)
│       │   │   ├── login.tsx
│       │   │   ├── signup.tsx
│       │   │   ├── verify-otp.tsx
│       │   │   └── _layout.tsx
│       │   ├── (tabs)/             # Tab navigation (authed)
│       │   │   ├── search/index.tsx  # NAV-01
│       │   │   ├── my-rides/index.tsx
│       │   │   ├── messages/index.tsx
│       │   │   ├── profile/index.tsx
│       │   │   └── _layout.tsx      # Tab bar config
│       │   ├── settings.tsx          # NAV-06
│       │   ├── onboarding.tsx        # ONBR flow
│       │   └── _layout.tsx          # Root layout (auth gate)
│       ├── components/
│       │   └── social-auth-buttons/  # Platform-specific (.ios.tsx, .android.tsx, .web.tsx)
│       ├── lib/
│       │   ├── supabase.ts          # createClient with LargeSecureStore
│       │   └── large-secure-store.ts # AES encryption adapter
│       ├── app.json
│       ├── babel.config.js          # nativewind/babel preset
│       ├── metro.config.js          # withNativeWind
│       ├── tailwind.config.js       # Tailwind v3 + NativeWind
│       ├── nativewind-env.d.ts      # NativeWind TypeScript types
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared/                      # @festapp/shared
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   └── database.ts     # Generated via `supabase gen types typescript`
│   │   │   ├── validation/
│   │   │   │   ├── auth.ts         # Auth input schemas (phone, email, etc.)
│   │   │   │   └── profile.ts      # Profile schemas
│   │   │   ├── constants/
│   │   │   │   └── auth.ts         # Auth-related constants
│   │   │   └── index.ts            # Barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                      # @festapp/config
│       ├── typescript/
│       │   └── base.json           # Shared tsconfig
│       └── package.json
│
├── supabase/
│   ├── migrations/
│   │   ├── 00000000000000_initial_setup.sql    # Extensions, utilities
│   │   ├── 00000000000001_profiles.sql          # Profiles table + trigger
│   │   └── 00000000000002_rls_policies.sql      # RLS for profiles
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── auth.ts             # AuthError class
│   │   │   └── supabase-client.ts  # Admin + user clients
│   │   ├── send-sms/               # Custom SMS hook (AWS SNS)
│   │   │   └── index.ts
│   │   └── delete-account/         # Account deletion (AUTH-05)
│   │       └── index.ts
│   ├── seed.sql
│   └── config.toml
│
├── .github/
│   └── workflows/
│       └── ci.yml                   # TEST-10: CI on every PR
│
├── turbo.json
├── pnpm-workspace.yaml
├── .npmrc                           # node-linker=hoisted
├── package.json
└── tsconfig.base.json
```

### Pattern 1: Platform-Specific Supabase Client Initialization

**What:** Web and mobile create Supabase clients differently. Web uses cookie-based sessions via @supabase/ssr. Mobile uses LargeSecureStore for encrypted token persistence.

**Web (Next.js) -- Three clients:**
```typescript
// apps/web/lib/supabase/client.ts (Browser)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// apps/web/lib/supabase/server.ts (Server Components)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}

// apps/web/lib/supabase/middleware.ts (Middleware)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )
  // CRITICAL: use getClaims() not getSession() for server-side validation
  const { data: { claims } } = await supabase.auth.getClaims()
  // Redirect unauthenticated users to login
  if (!claims && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return supabaseResponse
}
```

**Mobile (Expo) -- LargeSecureStore adapter:**
```typescript
// apps/mobile/lib/large-secure-store.ts
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as aesjs from 'aes-js'
import 'react-native-get-random-values'

export class LargeSecureStore {
  private async _encrypt(key: string, value: string) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8))
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1))
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value))
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey))
    return aesjs.utils.hex.fromBytes(encryptedBytes)
  }

  private async _decrypt(key: string, value: string) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key)
    if (!encryptionKeyHex) return encryptionKeyHex
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    )
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value))
    return aesjs.utils.utf8.fromBytes(decryptedBytes)
  }

  async getItem(key: string) {
    const encrypted = await AsyncStorage.getItem(key)
    if (!encrypted) return encrypted
    return await this._decrypt(key, encrypted)
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key)
    await SecureStore.deleteItemAsync(key)
  }

  async setItem(key: string, value: string) {
    const encrypted = await this._encrypt(key, value)
    await AsyncStorage.setItem(key, encrypted)
  }
}

// apps/mobile/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { LargeSecureStore } from './large-secure-store'
import { AppState, Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Auto-refresh tokens when app comes to foreground
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}
```

### Pattern 2: Custom SMS Hook for AWS SNS

**What:** Supabase Auth generates the OTP. A custom "Send SMS" hook routes the OTP through AWS SNS instead of Twilio/MessageBird.

**How it works:**
1. User calls `supabase.auth.signInWithOtp({ phone: '+420...' })`
2. Supabase Auth generates 6-digit OTP and calls the Send SMS Hook
3. Hook receives `{ user: { phone }, sms: { otp } }`
4. Edge Function sends SMS via AWS SNS
5. Returns 200 (empty body = success)
6. User receives SMS, enters OTP
7. Client calls `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`

```typescript
// supabase/functions/send-sms/index.ts
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

const sns = new SNSClient({
  region: Deno.env.get('AWS_REGION') ?? 'eu-central-1',
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
  },
})

Deno.serve(async (req) => {
  const payload = await req.json()
  const { user, sms } = payload

  await sns.send(new PublishCommand({
    PhoneNumber: user.phone,
    Message: `Your Festapp Rideshare code is: ${sms.otp}`,
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional',
      },
    },
  }))

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
```

**Configuration:** Enable the Send SMS Hook in Supabase Dashboard > Authentication > Hooks > Send SMS, pointing to the `send-sms` Edge Function.

### Pattern 3: Profile Auto-Creation on Signup

**What:** A database trigger automatically creates a `profiles` row when a new user signs up via auth.users.

```sql
-- From Supabase official docs, adapted for our schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'User'),
    NEW.phone
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Critical note:** `SECURITY DEFINER SET search_path = ''` is required because the trigger runs as `supabase_auth_admin` which cannot access `public` schema without it. If the trigger fails, signups will fail -- test thoroughly.

### Pattern 4: Social Auth with Native ID Tokens

**What:** Google and Apple auth use native SDKs to get ID tokens, then pass to `supabase.auth.signInWithIdToken()`. This avoids browser-based OAuth redirects on mobile.

```typescript
// Mobile: Google Sign In -> Supabase
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: googleIdToken,      // From Google Sign In SDK
  nonce: nonce,              // Must match SHA-256 of nonce passed to Google
})

// Mobile: Apple Sign In -> Supabase
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'apple',
  token: appleIdentityToken, // From @invertase/react-native-apple-authentication
  nonce: appleNonce,
  access_token: appleAuthorizationCode,
})

// Web: Google uses @react-oauth/google component, then same signInWithIdToken
// Web: Apple uses Supabase's built-in OAuth redirect flow
```

### Pattern 5: Account Deletion via Edge Function (AUTH-05)

**What:** Users can delete their account (required by Apple App Store). This requires a server-side Edge Function with service_role key.

```typescript
// supabase/functions/delete-account/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  // Get user from auth header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401 })

  // Use admin client to delete user (requires service_role key)
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // CASCADE on profiles FK handles data cleanup
  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
```

### Pattern 6: Expo Router Tab Navigation

**What:** File-based tab navigation matching the required bottom tabs (Search, My Rides, Messages, Profile).

```typescript
// apps/mobile/app/(tabs)/_layout.tsx
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#7C6FA0',  // pastel purple accent
      tabBarStyle: { backgroundColor: '#FAF7FF' },  // pastel background
    }}>
      <Tabs.Screen name="search/index" options={{
        title: 'Search',
        tabBarIcon: ({ color }) => <FontAwesome size={24} name="search" color={color} />,
      }} />
      <Tabs.Screen name="my-rides/index" options={{
        title: 'My Rides',
        tabBarIcon: ({ color }) => <FontAwesome size={24} name="car" color={color} />,
      }} />
      <Tabs.Screen name="messages/index" options={{
        title: 'Messages',
        tabBarIcon: ({ color }) => <FontAwesome size={24} name="comments" color={color} />,
      }} />
      <Tabs.Screen name="profile/index" options={{
        title: 'Profile',
        tabBarIcon: ({ color }) => <FontAwesome size={24} name="user" color={color} />,
      }} />
    </Tabs>
  )
}
```

### Anti-Patterns to Avoid

- **Using getSession() on the server:** It reads from storage without validation. Use `getClaims()` (validates JWT signature via JWKS, fast, cached) or `getUser()` (network request to auth server, slower but detects server-side revocation).
- **Storing service_role key in client code:** Never. Only use in Edge Functions. Client code uses anon key with RLS.
- **Using expo-secure-store directly for sessions:** 2048-byte limit will cause crashes with OAuth providers (Google tokens are large). Always use LargeSecureStore adapter.
- **Shared UI package in Phase 1:** Build web and mobile UIs independently first. Extract shared components in Phase 2+ when patterns emerge.
- **Requesting all permissions at onboarding:** Request location and notification permissions only when the feature is first used, with contextual explanation (ONBR-05, ONBR-06).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom JWT handling, token refresh | Supabase Auth + @supabase/ssr (web) + supabase-js auto-refresh (mobile) | Token refresh, PKCE flow, cookie management are complex and security-critical |
| Phone OTP generation | Custom OTP generation + verification | Supabase Auth `signInWithOtp()` + `verifyOtp()` | Supabase handles OTP generation, rate limiting, expiry. Only customize delivery via Send SMS Hook |
| Social auth flows | Custom OAuth implementation | `signInWithIdToken()` with native SDKs | Nonce handling, token validation, identity linking are handled by Supabase |
| Password reset | Custom reset token system | `supabase.auth.resetPasswordForEmail()` | Supabase handles token generation, email sending (via our SES hook), verification |
| Encrypted storage | Custom encryption for tokens | LargeSecureStore pattern from Supabase docs | AES-256 encryption with key in SecureStore, data in AsyncStorage -- proven pattern |
| Navigation | Custom tab bar from scratch | expo-router `<Tabs>` component | File-based routing, deep link support, built-in animation, platform-native behavior |
| Auth middleware | Custom middleware for session refresh | `updateSession()` pattern from @supabase/ssr docs | Cookie get/set coordination between request and response is tricky to get right |

## Common Pitfalls

### Pitfall 1: pnpm + React Native Dependency Resolution

**What goes wrong:** pnpm's default isolated installation breaks React Native's dependency resolution. Metro bundler cannot find packages that are symlinked in nested node_modules.
**Why it happens:** pnpm uses content-addressable storage with symlinks by default. React Native/Metro expects hoisted node_modules.
**How to avoid:** Add `.npmrc` at repo root with `node-linker=hoisted`. This is non-negotiable for Expo in pnpm monorepos.
**Warning signs:** Metro bundler errors like "Unable to resolve module" or "Module not found" during `expo start`.

### Pitfall 2: NativeWind v4 + Tailwind Version Mismatch

**What goes wrong:** Installing Tailwind v4 in the mobile package breaks all NativeWind styling. Components render without any styles.
**Why it happens:** NativeWind v4.x depends on Tailwind v3 internals. Tailwind v4 has completely different architecture.
**How to avoid:** Use `tailwindcss@3` in mobile/shared packages, `tailwindcss@latest` (v4) only in `apps/web`. The web app does NOT use NativeWind.
**Warning signs:** "NativeWind styling not working" -- check Tailwind version first. NativeWind v4.2.0+ is required for Expo SDK 54 with Reanimated v4.

### Pitfall 3: expo-secure-store 2048-Byte Limit

**What goes wrong:** OAuth sessions (especially Google) exceed 2048 bytes. Storing directly in expo-secure-store throws an error or silently truncates, breaking session persistence.
**Why it happens:** expo-secure-store wraps iOS Keychain / Android Keystore which have native size limits.
**How to avoid:** Use the LargeSecureStore adapter pattern (AES key in SecureStore, encrypted data in AsyncStorage). See code example in Architecture Patterns.
**Warning signs:** Auth works with email/password but crashes or loses session with Google/Apple sign-in.

### Pitfall 4: Auth Trigger Blocking Signups

**What goes wrong:** The `handle_new_user()` trigger on `auth.users` INSERT fails, which cascades and blocks the entire signup.
**Why it happens:** Trigger function has a bug (wrong column name, NOT NULL violation, etc.), or the `SECURITY DEFINER SET search_path = ''` is missing so the function cannot access the `public` schema.
**How to avoid:** (1) Always use `SECURITY DEFINER SET search_path = ''`. (2) Use COALESCE for nullable fields from `raw_user_meta_data`. (3) Test with all auth methods (phone, email, Google, Apple -- each provides different metadata).
**Warning signs:** "Database error saving new user" or 500 errors during signup.

### Pitfall 5: Missing OAuth Deep Link Configuration

**What goes wrong:** OAuth login works in development (Expo Go tunnel) but fails on production builds. The OAuth callback redirects to the website instead of the app.
**Why it happens:** Deep links require configuration at three levels: (1) Supabase Dashboard redirect URLs, (2) app.json scheme configuration, (3) Apple/Google developer console redirect URIs. Missing any one breaks the flow.
**How to avoid:** (1) Set `scheme` in app.json (e.g., `com.festapp.rideshare`). (2) Add redirect URL `com.festapp.rideshare://` to Supabase Auth settings. (3) Configure Apple Service ID redirect URI. (4) Test on physical device with production build, not just Expo Go.
**Warning signs:** OAuth popup opens but redirects to website or shows error after Google/Apple consent screen.

### Pitfall 6: Middleware Cookie Race Condition

**What goes wrong:** Refreshed auth tokens get lost -- user appears logged in on client but server returns 401. The middleware refreshes the token but the response cookies don't make it to the browser.
**Why it happens:** The @supabase/ssr middleware must coordinate setting cookies on both the request (for downstream server components) AND the response (for the browser). If the `supabaseResponse` variable is reassigned after cookies are set, they get lost.
**How to avoid:** Follow the official `updateSession()` pattern exactly. Never reassign `supabaseResponse` after initial creation except in the `setAll` callback. Always pass the modified `request` to `NextResponse.next()`.
**Warning signs:** Intermittent 401 errors, "session expired" despite being logged in, cookies missing from response headers.

### Pitfall 7: CI Pipeline Missing Supabase Type Generation

**What goes wrong:** Types in `packages/shared/src/types/database.ts` drift from actual database schema. Code compiles but fails at runtime because column names or types don't match.
**Why it happens:** `supabase gen types typescript` is run manually and forgotten. No CI step to verify types are current.
**How to avoid:** Add a CI step that generates types and fails if they differ from committed types. Or generate types as part of the build pipeline.
**Warning signs:** Runtime errors like "column X does not exist" despite TypeScript compilation succeeding.

## Code Examples

### Phone Auth Flow (Client-Side)

```typescript
// Shared validation (packages/shared/src/validation/auth.ts)
import { z } from 'zod'

export const PhoneSchema = z.string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in international format (+420...)')

export const OtpSchema = z.string()
  .length(6, 'Code must be 6 digits')
  .regex(/^\d+$/, 'Code must be numeric')

// Mobile: Phone signup/login
const sendOtp = async (phone: string) => {
  const parsed = PhoneSchema.parse(phone)
  const { error } = await supabase.auth.signInWithOtp({ phone: parsed })
  if (error) throw error
  // Navigate to OTP verification screen
}

const verifyOtp = async (phone: string, token: string) => {
  OtpSchema.parse(token)
  const { data: { session }, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })
  if (error) throw error
  // Session is now active, navigate to home/onboarding
}
```

### Auth State Gate (Mobile Root Layout)

```typescript
// apps/mobile/app/_layout.tsx
import { useEffect, useState } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getClaims().then(({ data: { claims } }) => {
      setSession(claims ? { /* reconstruct minimal session */ } as Session : null)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { setSession(session) }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isLoading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/search')
    }
  }, [session, segments, isLoading])

  if (isLoading) return null // or splash screen
  return <Slot />
}
```

### Database Schema (Phase 1)

```sql
-- 00000000000000_initial_setup.sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Auto-update trigger (from Festapp patterns)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 00000000000001_profiles.sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'User',
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  social_links JSONB DEFAULT '{}',
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'User'),
    NEW.phone
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 00000000000002_rls_policies.sql
CREATE POLICY "Users can view any profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No INSERT policy needed -- trigger handles creation
-- No DELETE policy -- CASCADE from auth.users handles deletion
```

### CI Pipeline (TEST-10)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Needed for Turborepo change detection

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # Turborepo runs all tasks in parallel where possible
      - run: pnpm turbo build lint typecheck test
```

### Turborepo Configuration

```jsonc
// turbo.json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### pnpm Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```ini
# .npmrc
node-linker=hoisted
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers-nextjs | @supabase/ssr | 2024 | Must use @supabase/ssr; auth-helpers is deprecated |
| getSession() for server auth | getClaims() (JWT validation via JWKS) | Late 2025 | getClaims() is faster and cryptographically validated; getSession() should not be trusted on server |
| expo-secure-store direct usage | LargeSecureStore (AES + AsyncStorage) | 2024 | OAuth tokens exceed 2048-byte limit |
| Manual Metro config for monorepos | Auto-detection (SDK 52+) | SDK 52 (2024) | No metro.config.js monorepo setup needed in SDK 54 |
| NativeWind v2-v3 | NativeWind v4.2+ | 2024-2025 | v4.2+ required for Reanimated v4 / SDK 54 |
| Twilio for SMS | AWS SNS via custom Auth hook | Feature available 2024 | Custom SMS hook allows any provider; SNS is cheapest for CZ/SK |

**Deprecated/outdated:**
- `@supabase/auth-helpers-*`: All auth helper packages are deprecated. Use `@supabase/ssr` for Next.js.
- `getSession()` on server: Reads from unvalidated storage. Use `getClaims()` or `getUser()`.
- NativeWind v2/v3: Incompatible with Reanimated v4 and SDK 54.

## Open Questions

1. **Supabase Auth Hook -- local testing**
   - What we know: Send SMS Hook works in production via Edge Functions
   - What's unclear: How to test the hook locally with `supabase start`. Discussion #36807 suggests it may require manual OTP insertion or skipping SMS in local dev.
   - Recommendation: For local development, configure Supabase to use its built-in phone auth (no hook) with test phone numbers. Enable the hook only for production.

2. **getClaims() availability in @supabase/ssr**
   - What we know: `getClaims()` is the newer recommended API that validates JWT via JWKS
   - What's unclear: Whether @supabase/ssr ^0.8 fully supports `getClaims()` in the middleware pattern, or if `getUser()` is still needed there
   - Recommendation: Start with `getUser()` in middleware (proven pattern), migrate to `getClaims()` once confirmed stable. Use `getClaims()` in client-side code.

3. **NativeWind v4.2 + SDK 54 stability**
   - What we know: v4.2.0+ is required for SDK 54 + Reanimated v4
   - What's unclear: Whether there are known issues with the combination (a Medium article from 2025 reports "NativeWind styling not working with Expo SDK 54")
   - Recommendation: Test basic styling early in scaffolding phase. Have fallback of using StyleSheet.create if NativeWind causes issues.

4. **Pastel design system -- dark mode implementation**
   - What we know: PLAT-01 requires light and dark mode with pastel palette
   - What's unclear: Best approach for dark mode pastels (inverted pastels look muddy)
   - Recommendation: Define separate color palettes for light/dark in tailwind.config. Use CSS variables / NativeWind's dark mode support. Research pastel dark mode patterns during design system implementation.

## Sources

### Primary (HIGH confidence)
- [Supabase SSR Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) -- @supabase/ssr setup, middleware pattern, server/browser client creation
- [Supabase Send SMS Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook) -- Custom SMS provider integration, hook input/output format
- [Supabase Phone Login](https://supabase.com/docs/guides/auth/phone-login) -- signInWithOtp, verifyOtp, OTP rate limits (60s cooldown, 1hr expiry)
- [Supabase Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data) -- Profile trigger pattern, SECURITY DEFINER
- [Supabase Expo Social Auth Quickstart](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth) -- Google/Apple signInWithIdToken pattern
- [Supabase Expo React Native Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) -- LargeSecureStore implementation
- [Supabase deleteUser API](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser) -- Account deletion via admin client
- [Supabase getClaims API](https://supabase.com/docs/reference/javascript/auth-getclaims) -- JWT validation via JWKS
- [Expo Router Tabs](https://docs.expo.dev/router/advanced/tabs/) -- File-based tab navigation setup
- [Expo Monorepos Guide](https://docs.expo.dev/guides/monorepos/) -- pnpm workspace, .npmrc, Metro auto-config
- [NativeWind Installation](https://www.nativewind.dev/docs/getting-started/installation) -- v4.2+ setup, Tailwind v3 requirement
- [Turborepo GitHub Actions](https://turborepo.dev/docs/guides/ci-vendors/github-actions) -- CI pipeline configuration

### Secondary (MEDIUM confidence)
- [Supabase Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) -- OAuth callback deep link configuration
- [Supabase User Self-Deletion Edge Function](https://blog.mansueli.com/supabase-user-self-deletion-empower-users-with-edge-functions) -- Account deletion pattern
- [NativeWind + SDK 54 Issues](https://medium.com/@matthitachi/nativewind-styling-not-working-with-expo-sdk-54-54488c07c20d) -- Known compatibility concerns
- [Supabase SMS Hook + MSG91 Example](https://medium.com/@shreebhagwat94/implementing-custom-sms-authentication-in-supabase-using-sms-hook-and-msg91-366d13acc81c) -- Custom SMS provider implementation walkthrough
- [byCedric/expo-monorepo-example](https://github.com/byCedric/expo-monorepo-example) -- Reference pnpm monorepo for Expo

### Tertiary (LOW confidence)
- [Supabase Discussion #36807](https://github.com/orgs/supabase/discussions/36807) -- Local testing of Auth Hooks
- [Supabase Discussion #39251](https://github.com/orgs/supabase/discussions/39251) -- SMS Hook OTP verification issues

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- versions and compatibility verified via official docs, npm, and Expo SDK 54 changelog
- Architecture (monorepo + auth): HIGH -- patterns from official Supabase docs, Expo monorepo guide, and Turborepo docs
- Architecture (design system): MEDIUM -- NativeWind v4.2 + SDK 54 has reported issues; dark mode pastels need design exploration
- Pitfalls: HIGH -- verified against official docs (SecureStore limit, pnpm hoisting, auth helpers deprecation)
- Custom SMS Hook: MEDIUM -- verified hook API from docs, but AWS SNS Edge Function integration has limited official examples

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable stack, 30-day validity)
