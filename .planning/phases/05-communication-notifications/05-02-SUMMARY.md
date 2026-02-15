---
phase: 05-communication-notifications
plan: 02
subsystem: notifications
tags: [onesignal, aws-ses, push-notifications, email, edge-functions, deno]

requires:
  - phase: 05-01
    provides: notification_preferences table and schema
  - phase: 01-foundation-auth
    provides: Supabase Edge Function shared clients (auth.ts, supabase-client.ts)
provides:
  - Central send-notification Edge Function for push and email dispatch
  - OneSignal REST API push helper (onesignal.ts)
  - AWS SES v2 email helper (ses.ts)
  - Notification preference checking logic (notifications.ts)
  - Web OneSignal service worker and initialization helper
affects: [05-03-chat, 05-04-booking-notifications, 05-05-notification-preferences-ui, 05-06-ride-reminders]

tech-stack:
  added: [react-onesignal, "@aws-sdk/client-sesv2 (npm: in Deno)"]
  patterns: [centralized notification dispatch, service_role auth for server-to-server Edge Functions, graceful degradation for unconfigured env vars]

key-files:
  created:
    - supabase/functions/_shared/onesignal.ts
    - supabase/functions/_shared/ses.ts
    - supabase/functions/_shared/notifications.ts
    - supabase/functions/send-notification/index.ts
    - apps/web/public/OneSignalSDKWorker.js
    - apps/web/lib/onesignal.ts
  modified:
    - apps/web/.env.local.example
    - apps/web/package.json

key-decisions:
  - "Service_role Bearer token auth for send-notification (server-to-server only, not user-facing)"
  - "SES client lazily instantiated and cached (module-level singleton pattern)"
  - "Null preferences treated as all-enabled for graceful first-use (Pitfall 7)"

patterns-established:
  - "Centralized notification dispatch: all triggers call send-notification Edge Function"
  - "Graceful degradation: missing env vars log warning and return false, never throw"
  - "Service-to-service auth: Bearer service_role key instead of user JWT for internal Edge Functions"

duration: 3min
completed: 2026-02-15
---

# Phase 5 Plan 2: Push Notification Infrastructure Summary

**Centralized send-notification Edge Function with OneSignal REST push, AWS SES v2 email, preference checking, and web OneSignal SDK setup**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T20:58:03Z
- **Completed:** 2026-02-15T21:01:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Shared notification helpers: OneSignal push (REST API), SES email (SDK v2), preference checking with type mapping
- Central send-notification Edge Function with service_role auth, preference-aware dispatch, and CORS support
- Web OneSignal infrastructure: service worker, init/login/logout helpers, react-onesignal SDK installed

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared Edge Function helpers** - `770a04f` (feat)
2. **Task 2: send-notification Edge Function and web OneSignal setup** - `728974e` (feat)

## Files Created/Modified
- `supabase/functions/_shared/onesignal.ts` - OneSignal REST API push helper using fetch() with include_aliases
- `supabase/functions/_shared/ses.ts` - AWS SES v2 email helper with lazy client initialization
- `supabase/functions/_shared/notifications.ts` - Preference checking with NotificationType-to-field mapping
- `supabase/functions/send-notification/index.ts` - Central dispatch Edge Function with service_role auth
- `apps/web/public/OneSignalSDKWorker.js` - OneSignal service worker for web push
- `apps/web/lib/onesignal.ts` - Web OneSignal init/login/logout helpers
- `apps/web/.env.local.example` - Added NEXT_PUBLIC_ONESIGNAL_APP_ID
- `apps/web/package.json` - Added react-onesignal dependency

## Decisions Made
- Service_role Bearer token auth for send-notification (server-to-server only) -- consistent with how Edge Functions call each other
- SES client lazily instantiated and cached at module level to avoid recreating on each invocation
- Null notification preferences treated as all-enabled (Pitfall 7 from research) -- no row = default behavior
- OneSignal push body fields conditionally included (data, url only when provided) to keep payloads clean

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None at this stage - all services degrade gracefully without configuration. When OneSignal and AWS SES are ready:
- Set ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY as Supabase secrets
- Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SES_FROM_EMAIL as Supabase secrets
- Set NEXT_PUBLIC_ONESIGNAL_APP_ID in web .env.local

## Next Phase Readiness
- Shared helpers ready for use by chat notifications (05-03), booking notifications (05-04), ride reminders (05-06)
- Web OneSignal SDK installed and ready for initialization in auth flow
- send-notification Edge Function deployable once Supabase secrets are configured

## Self-Check: PASSED

All 6 created files verified on disk. Both task commits (770a04f, 728974e) verified in git log.

---
*Phase: 05-communication-notifications*
*Completed: 2026-02-15*
