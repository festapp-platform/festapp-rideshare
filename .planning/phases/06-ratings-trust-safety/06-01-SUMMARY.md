---
phase: 06-ratings-trust-safety
plan: 01
subsystem: database
tags: [reviews, dual-reveal, reports, blocks, moderation, pg_cron, rls, admin]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: profiles table with rating_avg, rating_count columns
  - phase: 03-rides-matching
    provides: rides table, nearby_rides RPC, PostGIS functions
  - phase: 04-bookings-management
    provides: bookings table, booking RPCs, complete_ride RPC
  - phase: 05-communication-notifications
    provides: chat_conversations, send_chat_message RPC, _notify() helper, notification logs
provides:
  - reviews table with dual-reveal mechanism (revealed_at column)
  - submit_review and get_pending_reviews RPCs
  - reports table with report_user RPC
  - user_blocks table with block/unblock/get_blocked_users RPCs
  - moderation_actions table with admin warn/suspend/ban/unban RPCs
  - platform_stats_daily table with daily snapshot cron
  - is_admin() helper function for JWT-based admin check
  - block-aware nearby_rides, book_ride_instant, request_ride_booking, send_chat_message
  - profile columns: account_status, suspended_until, completed_rides_count
affects: [06-02-PLAN (review UI), 06-03-PLAN (report/block UI), 06-04-PLAN (admin panel), 06-05-PLAN (trust display)]

# Tech tracking
tech-stack:
  added: []
  patterns: [dual-reveal trigger with FOR UPDATE locking, bidirectional block filtering in RPCs, JWT app_metadata admin check]

key-files:
  created:
    - supabase/migrations/00000000000029_reviews.sql
    - supabase/migrations/00000000000030_reports_blocks.sql
    - supabase/migrations/00000000000031_admin_moderation.sql
  modified: []

key-decisions:
  - "Dual-reveal uses FOR UPDATE on counter-review query to prevent race conditions with concurrent review submissions"
  - "Block-aware RPCs use CREATE OR REPLACE to augment existing functions with NOT EXISTS block checks"
  - "Reports RLS uses inline JWT check instead of is_admin() to avoid forward dependency on migration 031"
  - "Admin notification on reports iterates auth.users with is_admin metadata rather than a separate admin table"
  - "Rating aggregation trigger fires on both INSERT and UPDATE OF revealed_at for immediate recalculation"

patterns-established:
  - "Dual-reveal pattern: reviews.revealed_at NULL = hidden, trigger sets on counter-review, cron reveals after 14 days"
  - "Block filtering pattern: NOT EXISTS user_blocks bidirectional check in all user-facing RPCs"
  - "Admin check pattern: is_admin() reads auth.jwt() -> app_metadata ->> is_admin"
  - "Moderation action audit: all admin actions recorded in moderation_actions table with reason"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 6 Plan 1: Database Foundation Summary

**Reviews with dual-reveal triggers, reports/blocks with bidirectional filtering, admin moderation RPCs with JWT-based access control, platform stats cron, and suspension auto-expiry**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T22:21:58Z
- **Completed:** 2026-02-15T22:25:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Reviews table with dual-reveal mechanism: reviews hidden until both parties submit (or 14-day expiry via pg_cron)
- Reports, user_blocks, moderation_actions, platform_stats_daily tables with full RLS
- Block-aware modifications to nearby_rides, book_ride_instant, request_ride_booking, send_chat_message
- Complete admin moderation toolkit: warn, suspend, ban, unban, resolve reports, hide/delete reviews
- Completed rides count tracking triggers on both bookings and rides completion
- Three pg_cron jobs: reveal-expired-reviews, daily-platform-stats, expire-suspensions

## Task Commits

Each task was committed atomically:

1. **Task 1: Reviews migration** - `021a329` (feat)
2. **Task 2: Reports, blocks, admin moderation** - `abe59c7` (feat)

## Files Created/Modified

- `supabase/migrations/00000000000029_reviews.sql` - Reviews table, dual-reveal trigger, rating aggregation, submit_review/get_pending_reviews RPCs, completed_rides_count triggers, reveal cron
- `supabase/migrations/00000000000030_reports_blocks.sql` - Reports/blocks tables, report_user/block_user/unblock_user RPCs, block-aware nearby_rides/booking/chat RPCs
- `supabase/migrations/00000000000031_admin_moderation.sql` - is_admin(), moderation_actions, admin RPCs, platform_stats_daily, suspension expiry cron, admin notification trigger

## Decisions Made

- **Dual-reveal locking:** Used `SELECT ... FOR UPDATE` on the counter-review query in check_review_reveal trigger to prevent race conditions when both users submit reviews simultaneously
- **Block-aware RPCs via CREATE OR REPLACE:** Augmented existing nearby_rides, book_ride_instant, request_ride_booking, and send_chat_message with block checks while preserving all original logic
- **Reports RLS inline JWT check:** Used `COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)` directly in reports RLS policies to avoid forward dependency on is_admin() defined in migration 031
- **Admin notification via auth.users query:** Iterates auth.users where raw_app_meta_data has is_admin=true rather than maintaining a separate admin registry table
- **Rating recalculation in admin hide/delete:** Manual recalculation in admin_hide_review and admin_delete_review since the trigger condition (revealed_at IS NOT NULL) would not fire when hiding

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Admin users are designated by setting `is_admin: true` in their Supabase auth user `raw_app_meta_data` via the Supabase dashboard or SQL.

## Next Phase Readiness

- Database layer complete for all Phase 6 features
- Reviews UI (06-02) can use submit_review and get_pending_reviews RPCs
- Report/block UI (06-03) can use report_user, block_user, unblock_user, get_blocked_users RPCs
- Admin panel (06-04) can use all admin RPCs and is_admin() for access control
- Trust display (06-05) can read reviews and completed_rides_count from profiles

## Self-Check: PASSED

- [x] supabase/migrations/00000000000029_reviews.sql exists
- [x] supabase/migrations/00000000000030_reports_blocks.sql exists
- [x] supabase/migrations/00000000000031_admin_moderation.sql exists
- [x] Commit 021a329 exists (Task 1)
- [x] Commit abe59c7 exists (Task 2)

---
*Phase: 06-ratings-trust-safety*
*Completed: 2026-02-15*
