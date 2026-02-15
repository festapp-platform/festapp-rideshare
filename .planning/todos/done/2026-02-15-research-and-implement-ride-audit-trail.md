---
created: 2026-02-15T20:00:00.503Z
title: Research and implement ride audit trail
area: database
files:
  - supabase/migrations/00000000000015_booking_rpcs.sql
  - supabase/migrations/00000000000007_rides.sql
  - supabase/migrations/00000000000014_bookings.sql
  - supabase/migrations/00000000000013_ride_expiry_cron.sql
---

## Problem

No audit trail exists for ride lifecycle events. When a ride is cancelled, completed, edited, or expires, there's no history of what changed, who did it, or why. Currently only booking cancellations track `cancelled_by`/`cancellation_reason`. The rides table has zero change history.

Missing tracking:
- Ride cancellation metadata (who, when, reason) — rides table lacks `cancelled_by`, `cancellation_reason`, `cancelled_at`
- Complete status change history (timestamps for each transition)
- Ride edit history (price changes, time changes, seat changes)
- Completion metadata
- System events (cron expiry)
- Centralized event log

This is needed for driver reliability scoring, dispute resolution, and general auditability.

## Solution

**Research first** — web research into best practices:
- Event sourcing vs CDC (Change Data Capture) vs trigger-based audit
- PostgreSQL-specific patterns (audit triggers, temporal tables, pgaudit extension)
- Supabase-compatible approaches

**Then implement** (likely approach — validate with research):
- `ride_events` table: append-only event log with `ride_id`, `event_type`, `actor_id`, `old_data` JSONB, `new_data` JSONB, `metadata` JSONB
- AFTER INSERT/UPDATE triggers on rides table for automatic capture
- Update existing RPCs (`cancel_ride`, `complete_ride`, `expire_past_rides`, booking RPCs) to INSERT events
- Add `cancelled_by`, `cancellation_reason`, `cancelled_at` columns to rides table
- RLS: drivers see events for their rides, passengers see events for rides they booked
- Optional UI: timeline view on ride detail/manage page (can defer)
