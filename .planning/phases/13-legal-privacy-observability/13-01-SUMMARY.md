---
phase: 13-legal-privacy-observability
plan: 01
subsystem: database, api
tags: [audit, logging, postgresql, triggers, jsonb, edge-functions, observability]

# Dependency graph
requires:
  - phase: 00-foundation (migration 00000000000005_notifications)
    provides: log_emails, log_sms tables
  - phase: 00-foundation (migration 00000000000010_audit)
    provides: audit.record_version table and fn_record_version trigger
provides:
  - Enhanced audit trail with changed_fields JSON diff and actor_id
  - SMS logging in send-sms auth hook
  - Auth email logging in send-email auth hook
  - Audit triggers for moderation tables (reports, user_blocks)
  - Admin RLS policy for full audit visibility
affects: [13-02, 13-03, admin-panel, moderation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSON diff in PostgreSQL trigger via jsonb_object_keys loop"
    - "actor_id capture with BEGIN/EXCEPTION fallback for service_role"
    - "Best-effort REST API logging in auth hooks (raw fetch, try/catch)"

key-files:
  created:
    - supabase/migrations/20260217000013_legal_observability.sql
  modified:
    - supabase/functions/send-sms/index.ts
    - supabase/functions/send-email/index.ts

key-decisions:
  - "Used public.is_admin() for audit RLS policy (consistent with safety migration pattern)"
  - "Auth email logging uses user?.id ?? null since user_id is now nullable"

patterns-established:
  - "Audit changed_fields stores {field: {old: val, new: val}} for human-readable diffs"
  - "Best-effort logging in auth hooks: never block auth flow for observability"

requirements-completed: [LOG-01, LOG-02, LOG-03, ADMIN-07]

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 13 Plan 01: Communication Logging & Audit Enhancement Summary

**Audit trail with JSON field diffs, SMS/email logging in auth hooks, and moderation audit triggers**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T22:16:32Z
- **Completed:** 2026-02-16T22:19:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Enhanced audit.record_version with changed_fields JSONB (stores only diffs) and actor_id UUID
- SMS OTP delivery now logged to log_sms table via best-effort REST API call
- Auth emails (signup confirmation, recovery, etc.) now logged to log_emails table
- Made log_emails.user_id nullable to support signup confirmation logging
- Added audit triggers for reports and user_blocks moderation tables
- Added admin RLS policy for full audit entry visibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration for audit enhancement and logging fixes** - `78d23de` (feat)
2. **Task 2: Add SMS and auth email logging to Edge Functions** - `bfe7334` (feat)

## Files Created/Modified
- `supabase/migrations/20260217000013_legal_observability.sql` - Audit enhancement, nullable fix, moderation triggers, admin RLS
- `supabase/functions/send-sms/index.ts` - SMS logging to log_sms after SNS delivery
- `supabase/functions/send-email/index.ts` - Auth email logging to log_emails after SES delivery

## Decisions Made
- Used `public.is_admin()` function for audit RLS policy (consistent with all other admin policies in safety migration)
- Auth email logging captures `user?.id ?? null` since user_id is now nullable (signup emails fire before profile creation)
- LOG-03 (push notification logging) confirmed already done -- not rebuilt

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing web build failure: TypeScript error in translations.ts for missing `location.sharingWith`/`location.stop`/`location.passengers` keys in `en` object (keys are actually present but build fails). This is NOT caused by 13-01 changes (Edge Functions are not part of web build). Verified by testing build before and after changes -- same failure both times.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All communication channels now have logging (email, SMS, push notifications)
- Audit trail captures who changed what with field-level diffs
- Ready for Phase 13-02 (ToS consent) and 13-03 (location privacy banner)

---
*Phase: 13-legal-privacy-observability*
*Completed: 2026-02-16*
