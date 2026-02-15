---
phase: 02-profiles-identity
plan: 01
subsystem: database
tags: [supabase, postgres, rls, zod, storage, migrations]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: profiles table, initial_setup with update_updated_at_column trigger, shared package structure
provides:
  - Vehicles table with full CRUD RLS policies
  - Storage buckets (avatars, vehicles) with user-scoped upload policies
  - Profile columns for user_role, id_verified, id_document_url
  - is_phone_verified SQL function deriving from auth.users
  - Zod schemas for profile and vehicle validation
  - Storage constants and path helpers
  - Updated Database TypeScript types
affects: [02-02, 02-03, 02-04, 02-05, 03-rides-matching]

# Tech tracking
tech-stack:
  added: []
  patterns: [user-scoped storage RLS via foldername, derived columns via SQL functions, single source of truth for shared schemas]

key-files:
  created:
    - supabase/migrations/00000000000003_vehicles.sql
    - supabase/migrations/00000000000004_storage_buckets.sql
    - supabase/migrations/00000000000005_profile_updates.sql
    - packages/shared/src/validation/profile.ts
    - packages/shared/src/constants/storage.ts
  modified:
    - packages/shared/src/types/database.ts
    - packages/shared/src/index.ts
    - packages/shared/src/validation/auth.ts

key-decisions:
  - "DisplayNameSchema moved from auth.ts to profile.ts as single source of truth; re-exported from auth.ts for backward compatibility"
  - "is_phone_verified uses EXISTS query for boolean return rather than SELECT phone_confirmed_at"
  - "Storage path helpers use Date.now() suffix for CDN cache-busting"

patterns-established:
  - "User-scoped storage RLS: (storage.foldername(name))[1] = auth.uid()::text"
  - "Derived fields via SQL functions rather than duplicated columns (is_phone_verified)"
  - "Validation schema consolidation: single canonical location with re-exports"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 2 Plan 1: Data Layer & Shared Schemas Summary

**Vehicles table, avatars/vehicles storage buckets with user-scoped RLS, profile role/verification columns, and Zod validation schemas for profiles and vehicles**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T16:43:00Z
- **Completed:** 2026-02-15T16:45:47Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Three SQL migrations pushed to remote Supabase: vehicles table, storage buckets, profile columns
- Shared Zod schemas for profile updates and vehicle data with inferred TypeScript types
- Storage constants with bucket names, image constraints, and cache-busting path helpers
- Database types updated with vehicles table, new profile columns, and is_phone_verified function

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database migrations** - `05a77ac` (feat)
2. **Task 2: Create shared validation schemas, storage constants, and update database types** - `710bc8b` (feat)

## Files Created/Modified
- `supabase/migrations/00000000000003_vehicles.sql` - Vehicles table with make, model, color, license_plate, photo_url, is_primary and full CRUD RLS
- `supabase/migrations/00000000000004_storage_buckets.sql` - Avatars (2MB) and vehicles (5MB) public buckets with user-scoped upload/update/delete RLS
- `supabase/migrations/00000000000005_profile_updates.sql` - Profile user_role, id_verified, id_document_url columns and is_phone_verified function
- `packages/shared/src/validation/profile.ts` - DisplayNameSchema, BioSchema, SocialLinksSchema, UserRoleSchema, ProfileUpdateSchema, VehicleSchema
- `packages/shared/src/constants/storage.ts` - STORAGE_BUCKETS, IMAGE_CONSTRAINTS, ALLOWED_IMAGE_TYPES, getAvatarPath, getVehiclePhotoPath
- `packages/shared/src/types/database.ts` - Updated with vehicles table types and profile columns
- `packages/shared/src/index.ts` - Added re-exports for all new schemas, types, and constants
- `packages/shared/src/validation/auth.ts` - DisplayNameSchema removed and re-exported from profile.ts

## Decisions Made
- DisplayNameSchema moved from auth.ts to profile.ts as the single source of truth. Auth.ts re-exports it for backward compatibility with existing imports (tests, signup pages).
- is_phone_verified function uses EXISTS pattern for clean boolean return, with SECURITY DEFINER to access auth.users.
- Storage path helpers use Date.now() timestamp suffix for CDN cache-busting per research guidance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Re-exported DisplayNameSchema from auth.ts for backward compatibility**
- **Found during:** Task 2 (shared validation schemas)
- **Issue:** Removing DisplayNameSchema from auth.ts broke existing test imports (`import { DisplayNameSchema } from '../auth'`)
- **Fix:** Added `export { DisplayNameSchema }` re-export to auth.ts alongside the import from profile.ts
- **Files modified:** packages/shared/src/validation/auth.ts
- **Verification:** `pnpm turbo typecheck` passes clean across all 3 packages
- **Committed in:** 710bc8b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for backward compatibility. No scope creep.

## Issues Encountered
- Pre-existing test failure in PasswordSchema test (expects min 8 chars but schema uses min 6). Not introduced by this plan, verified by running tests on clean main branch. Not addressed here as it's outside plan scope.

## User Setup Required
None - migrations pushed to remote Supabase automatically.

## Next Phase Readiness
- Database foundation complete for all profile, vehicle, and image upload features
- Shared schemas importable from `@festapp/shared` for use in API routes and form validation
- Storage buckets ready for avatar and vehicle photo uploads
- Ready for Plan 02-02 (profile editing API/UI) and Plan 02-03 (vehicle management)

---
*Phase: 02-profiles-identity*
*Completed: 2026-02-15*
