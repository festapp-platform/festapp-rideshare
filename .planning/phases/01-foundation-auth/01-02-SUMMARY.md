---
phase: 01-foundation-auth
plan: 02
subsystem: database
tags: [supabase, postgres, rls, edge-functions, aws-sns, profiles, auth-trigger, ssr, large-secure-store]

# Dependency graph
requires:
  - phase: 01-01
    provides: "pnpm + Turborepo monorepo with workspace protocol"
provides:
  - Profiles table with auto-creation trigger on auth.users INSERT
  - RLS policies (read any, update own) on profiles
  - send-sms Edge Function for AWS SNS OTP delivery
  - delete-account Edge Function with admin client
  - Shared Edge Function utilities (AuthError, admin/user client factories)
  - Web Supabase clients (browser, server, middleware) via @supabase/ssr
  - Mobile Supabase client with LargeSecureStore encrypted session persistence
  - Database type definitions matching profiles schema
affects: [01-03, 01-04, 01-05, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: [@supabase/supabase-js@2, @supabase/ssr@0.8, expo-secure-store@14, @react-native-async-storage/async-storage@2, aes-js@3, react-native-get-random-values]
  patterns: [SECURITY DEFINER SET search_path for auth triggers, LargeSecureStore for session encryption, getUser() in middleware not getSession(), dual admin/user client pattern in Edge Functions]

key-files:
  created:
    - supabase/config.toml
    - supabase/migrations/00000000000000_initial_setup.sql
    - supabase/migrations/00000000000001_profiles.sql
    - supabase/migrations/00000000000002_rls_policies.sql
    - supabase/functions/_shared/auth.ts
    - supabase/functions/_shared/supabase-client.ts
    - supabase/functions/send-sms/index.ts
    - supabase/functions/delete-account/index.ts
    - supabase/seed.sql
    - apps/web/lib/supabase/client.ts
    - apps/web/lib/supabase/server.ts
    - apps/web/lib/supabase/middleware.ts
    - apps/web/middleware.ts
    - apps/web/.env.local.example
    - apps/mobile/lib/supabase.ts
    - apps/mobile/lib/large-secure-store.ts
    - apps/mobile/.env.local.example
  modified:
    - packages/shared/src/types/database.ts
    - apps/web/package.json
    - apps/mobile/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Enabled SMS signup with test OTP (4152127777=123456) for local dev; production uses Send SMS Hook via AWS SNS"
  - "Used getUser() in middleware (not getClaims()) per research open question #2 -- proven pattern"
  - "Added .env.local.example exception to web .gitignore (Next.js scaffolding ignores all .env* files)"

patterns-established:
  - "SECURITY DEFINER SET search_path = '' on all auth triggers"
  - "Dual Supabase client pattern: admin (service_role) for system ops, user-scoped for permission-sensitive queries"
  - "LargeSecureStore: AES key in SecureStore, encrypted data in AsyncStorage (handles >2048-byte OAuth sessions)"
  - "getUser() for server-side auth validation in Next.js middleware"
  - "Public route allowlist pattern in middleware"

# Metrics
duration: 4min
completed: 2026-02-15
---

# Phase 1 Plan 2: Supabase Setup Summary

**Profiles table with auto-creation trigger, AWS SNS SMS Edge Function, delete-account Edge Function, and platform-specific Supabase clients (cookie-based web, AES-encrypted mobile)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-15T15:20:19Z
- **Completed:** 2026-02-15T15:24:42Z
- **Tasks:** 2
- **Files modified:** 22

## Accomplishments
- Complete Supabase schema: profiles table with auto-creation trigger that fires on every signup
- Two Edge Functions: send-sms (AWS SNS for phone OTP) and delete-account (Apple App Store requirement)
- Web app has three Supabase clients (browser, server, middleware) using @supabase/ssr with cookie-based sessions
- Mobile app has Supabase client with LargeSecureStore (AES encryption handles large OAuth tokens)
- Database types placeholder matches profiles schema for immediate type safety
- All three packages typecheck successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase migrations, Edge Functions, and seed data** - `914b799` (feat)
2. **Task 2: Create platform-specific Supabase clients and environment config** - `37a2c6c` (feat)
3. **Housekeeping: supabase gitignore and web favicon** - `c1bea33` (chore)

## Files Created/Modified
- `supabase/config.toml` - Supabase local dev config with SMS signup enabled and test OTP
- `supabase/migrations/00000000000000_initial_setup.sql` - uuid-ossp extension, update_updated_at trigger
- `supabase/migrations/00000000000001_profiles.sql` - Profiles table, handle_new_user trigger, on_auth_user_created
- `supabase/migrations/00000000000002_rls_policies.sql` - Read any profile, update own profile policies
- `supabase/functions/_shared/auth.ts` - AuthError class with HTTP status codes
- `supabase/functions/_shared/supabase-client.ts` - createAdminClient() and createUserClient() factories
- `supabase/functions/send-sms/index.ts` - AWS SNS SMS delivery for Supabase Auth hook
- `supabase/functions/delete-account/index.ts` - User self-deletion via admin API
- `supabase/seed.sql` - Comment-only file (profiles created via trigger)
- `apps/web/lib/supabase/client.ts` - Browser Supabase client via createBrowserClient
- `apps/web/lib/supabase/server.ts` - Server component client with cookie adapter
- `apps/web/lib/supabase/middleware.ts` - Session refresh and auth redirect logic
- `apps/web/middleware.ts` - Next.js middleware entry point
- `apps/web/.env.local.example` - Required web environment variables
- `apps/mobile/lib/large-secure-store.ts` - AES-encrypted storage adapter for Supabase sessions
- `apps/mobile/lib/supabase.ts` - Mobile Supabase client with auto-refresh on foreground
- `apps/mobile/.env.local.example` - Required mobile environment variables
- `packages/shared/src/types/database.ts` - Updated with profiles table type definitions

## Decisions Made
- Enabled SMS signup with test OTP for local development (avoids needing real SMS during dev)
- Used getUser() in middleware instead of getClaims() -- getClaims() support in @supabase/ssr middleware is unconfirmed per research
- Added .env.local.example exception to web .gitignore since Next.js scaffolding ignores all .env* by default

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed .gitignore excluding .env.local.example**
- **Found during:** Task 2 (committing web environment example)
- **Issue:** Next.js scaffolding created `.gitignore` with `.env*` pattern that blocked committing `.env.local.example`
- **Fix:** Added `!.env.local.example` exception to `apps/web/.gitignore`
- **Files modified:** `apps/web/.gitignore`
- **Verification:** `git add` succeeds, file committed
- **Committed in:** 37a2c6c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor gitignore fix to allow example env files. No scope creep.

## Issues Encountered
None - all tasks executed smoothly.

## User Setup Required

External services require manual configuration before auth flows will work in production:
- **Supabase:** Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
- **Supabase Dashboard:** Enable Phone Auth provider, Enable Email Auth provider, Configure Send SMS Hook
- **AWS:** Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION for SMS delivery via SNS

Local development works without external services using `supabase start` and test OTP.

## Next Phase Readiness
- Database schema ready with profiles table and auto-creation trigger
- Edge Functions ready for SMS delivery and account deletion
- Platform-specific Supabase clients configured for Plan 03 auth flow implementation
- All packages typecheck successfully

## Self-Check: PASSED

- All 18 key files verified present
- All 3 task commits (914b799, 37a2c6c, c1bea33) verified in git log
- `pnpm turbo typecheck` passes for all 3 packages

---
*Phase: 01-foundation-auth*
*Completed: 2026-02-15*
