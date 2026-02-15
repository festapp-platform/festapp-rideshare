# Phase 6: Ratings, Trust & Safety - Research

**Researched:** 2026-02-15
**Domain:** Mutual ratings/reviews, user reporting/blocking, admin moderation panel, platform stats
**Confidence:** HIGH

## Summary

Phase 6 adds four interconnected subsystems: (1) a mutual rating/review system with BlaBlaCar-style dual-reveal, (2) user reporting with free-text descriptions, (3) silent user blocking, and (4) an admin panel for moderation and platform statistics. The primary technical challenge is the **dual-reveal review pattern** -- reviews stay hidden until both parties submit (or the 14-day window expires), which requires careful database design and conditional visibility logic in queries.

The codebase already has infrastructure that Phase 6 builds on: `profiles.rating_avg` and `profiles.rating_count` columns (created in Phase 1), a rating display section on the public profile page and ride cards (Phase 2/3), the `complete_ride` RPC and booking completion flow (Phase 4), and the `_notify()` helper plus `send-notification` Edge Function (Phase 5). The reviews table referenced in the architecture research (ARCHITECTURE.md) has NOT been created yet -- it needs to be built.

For the admin panel, the simplest approach is adding an `is_admin` boolean to `raw_app_meta_data` via Supabase custom claims (accessible through `auth.jwt()`), then protecting the `/admin` route with middleware and using RLS policies that check the JWT claim. This avoids a separate `user_roles` table since only one admin role is needed for now.

**Primary recommendation:** Use a `reviews` table with a `revealed_at` timestamp column that controls visibility. Populate `revealed_at` when both reviews exist (via trigger) or when the 14-day deadline passes (via pg_cron). All review queries filter on `revealed_at IS NOT NULL` for public visibility. Use Supabase custom claims (`app_metadata.is_admin`) for admin role, with RLS policies and Next.js middleware for access control.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Rating & review flow
- Rating prompt appears immediately after driver marks ride as completed (modal); if skipped, prompts again on next app open + push notification reminder
- 14-day window to submit a rating after ride completion, then opportunity expires
- BlaBlaCar-style reveal: reviews are hidden until both parties submit; if only one rates within 14 days, their review becomes visible after the deadline
- 1-5 star overall rating with optional free text review (no category breakdown, no tags)
- Reviews cannot be edited or deleted once submitted (BlaBlaCar approach)
- No replies to reviews -- one-way only
- Only completed rides can be rated (cancelled rides cannot be rated)

#### Report & block behavior
- Reports are free text only (no predefined categories) -- user describes the issue in their own words
- Silent blocking -- blocked person receives no notification
- Reports and blocks are separate actions (can report without blocking, can block without reporting)

#### Admin panel
- Admin panel lives at /admin route within the existing Next.js web app (not a separate deployment)
- Responsive layout -- works on mobile for quick moderation on the go
- Role system with admin role only for now (moderator role deferred until team grows)
- Admins can: view/resolve reports, warn/suspend/ban users, hide/delete offensive reviews, view platform stats
- When banning a user, admin decides per case whether to auto-cancel active rides or let them stand
- Admins receive push + email notifications when new reports come in
- Platform stats: total users, rides, bookings, active reports + daily/weekly trend graphs for signups, rides posted, bookings made

#### Profile trust display
- Rating shown on ride cards in search results (BlaBlaCar approach) and on profiles
- Reviews ordered newest first on profile page
- "Experienced" badge for users with 10+ completed rides (in addition to existing phone verified + ID verified badges)

### Claude's Discretion

- New user display (no ratings yet) -- pick best approach for indicating unrated users
- Block behavior specifics (full invisibility vs interaction block)
- Unblock policy (reversible from settings vs permanent)
- Rating reminder cadence (number and timing of push reminders)
- Minimum ratings threshold before showing average score
- Star rating display format on profiles (stars + number vs number only)
- Moderation action tiers (warn/suspend/ban levels and suspension durations)

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope
</user_constraints>

## Discretion Recommendations

### New user display (no ratings yet)
**Recommendation:** Show "New" label instead of stars when a user has zero ratings. Once they have at least 1 rating, show the numeric average. Do NOT require a minimum threshold to display -- even 1 rating provides signal. This follows BlaBlaCar's pattern where new users get a "New member" badge.
**Confidence:** HIGH -- standard industry pattern.

### Block behavior specifics
**Recommendation:** Full invisibility approach. When User A blocks User B:
- B's rides do not appear in A's search results (filter in `nearby_rides` RPC)
- A's rides do not appear in B's search results
- B cannot book A's rides (check in booking RPCs)
- B cannot send messages to A (check in chat RPCs)
- Existing confirmed bookings between them are NOT auto-cancelled (to avoid revealing the block)
- B sees no indication they have been blocked
This is the BlaBlaCar approach and prevents escalation.
**Confidence:** HIGH -- standard pattern for safety features.

### Unblock policy
**Recommendation:** Reversible from settings. User can view their block list in settings and unblock any user. Unblocking restores mutual visibility. This is standard across all platforms (BlaBlaCar, Uber, etc.).
**Confidence:** HIGH.

### Rating reminder cadence
**Recommendation:** Three reminders total:
1. Immediate: Modal appears right after ride completion (driver-side) or when passenger opens app after ride is marked complete
2. 24 hours after completion: Push notification ("Rate your ride with [name]")
3. 7 days after completion: Final push notification ("Last chance to rate your ride")
After 14 days, the opportunity expires silently. Three reminders is enough to prompt action without being annoying.
**Confidence:** MEDIUM -- could adjust based on user feedback.

### Minimum ratings threshold before showing average score
**Recommendation:** No minimum. Show the rating from the first review. Display format: "4.5 (3)" where the count in parentheses signals reliability. Users can judge credibility themselves based on count. Hiding ratings until N reviews discourages early adopters from rating.
**Confidence:** HIGH -- BlaBlaCar shows ratings immediately.

### Star rating display format
**Recommendation:** Stars + numeric value + count. Format: [filled/empty stars] 4.5 (12 ratings). On ride cards in search results (compact): [single star icon] 4.5 (12) -- already implemented this way in the existing `ride-card.tsx`. On profile page (expanded): full 5-star visual + numeric + count -- already implemented in `profile/[id]/page.tsx`.
**Confidence:** HIGH -- already matches existing implementation.

### Moderation action tiers
**Recommendation:**
- **Warning:** Admin sends a warning message visible to the user on login. No functional restriction. Tracked in admin logs.
- **Suspension:** User cannot post rides or book seats for a defined period. Can still view the app and chat about existing bookings. Standard durations: 3 days, 7 days, 30 days (admin picks).
- **Ban:** Permanent. User cannot log in. All active rides cancelled, all pending bookings cancelled. Account marked as banned. Only another admin can lift a ban.

Suspensions auto-expire via pg_cron. Bans are permanent until manually reversed.
**Confidence:** MEDIUM -- standard tiered system, durations are adjustable.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.95 | Reviews CRUD, reports, blocks, admin queries | Already in use |
| PostgreSQL custom claims | N/A | Admin role via `raw_app_meta_data` | Simplest approach for single-role admin; no extra tables |
| pg_cron | N/A | Review reveal deadline, suspension expiry | Already in use for ride expiry and reminders |
| zod | ^4.3 | Validation schemas for reviews, reports | Already in use |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | already installed | Formatting review dates, time-since calculations | Already used across the app |
| sonner | already installed | Toast notifications for moderation actions | Already used for feedback |
| recharts | ^2.15 | Admin dashboard charts (signup/ride trends) | Standard React charting library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom claims (`app_metadata`) for admin role | `user_roles` table with RBAC | Full RBAC is overkill for one role; adds complexity. Custom claims are embedded in JWT, no extra query needed |
| recharts for admin stats | Chart.js / nivo | recharts is the most popular React charting library, works with SSR, tree-shakeable. Chart.js requires canvas. nivo is heavier. |
| pg_cron for review reveal | Application-side cron / Edge Function cron | pg_cron is already used in the project, runs reliably, no extra infrastructure |

**Installation:**
```bash
# Only new package needed (admin charts)
cd apps/web && pnpm add recharts
```

## Architecture Patterns

### New Database Schema

```sql
-- ============================================================
-- Reviews table: mutual ratings after completed rides
-- ============================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (char_length(comment) <= 500),

  -- Dual-reveal mechanism
  -- NULL = hidden (waiting for other party or deadline)
  -- Timestamp = visible (both submitted or 14-day deadline passed)
  revealed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only review once per booking
  UNIQUE (booking_id, reviewer_id)
);

-- Performance indexes
CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id, revealed_at DESC NULLS LAST)
  WHERE revealed_at IS NOT NULL;
CREATE INDEX idx_reviews_ride ON public.reviews(ride_id);
CREATE INDEX idx_reviews_booking ON public.reviews(booking_id);
-- For pg_cron reveal scan: find unrevealed reviews older than 14 days
CREATE INDEX idx_reviews_unrevealed ON public.reviews(created_at)
  WHERE revealed_at IS NULL;

-- ============================================================
-- Reports table: user-submitted reports about other users
-- ============================================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id),
  -- Optional context references
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  review_id UUID REFERENCES public.reviews(id) ON DELETE SET NULL,

  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),

  -- Admin resolution
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);
CREATE INDEX idx_reports_reported_user ON public.reports(reported_user_id);

-- ============================================================
-- Blocks table: user blocks (silent, bidirectional visibility)
-- ============================================================
CREATE TABLE public.user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id) -- Cannot block self
);

CREATE INDEX idx_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON public.user_blocks(blocked_id);

-- ============================================================
-- Moderation actions table: admin actions on users
-- ============================================================
CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('warning', 'suspension', 'ban', 'unban', 'unsuspend')),
  reason TEXT NOT NULL,
  -- For suspensions: when the suspension expires
  expires_at TIMESTAMPTZ,
  -- Link to report that triggered this action (optional)
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mod_actions_user ON public.moderation_actions(user_id, created_at DESC);

-- ============================================================
-- Profile extensions for moderation
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'banned')),
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_rides_count INT DEFAULT 0;

-- ============================================================
-- Platform stats: materialized daily snapshot (for admin dashboard)
-- ============================================================
CREATE TABLE public.platform_stats_daily (
  date DATE PRIMARY KEY,
  total_users INT NOT NULL DEFAULT 0,
  new_users INT NOT NULL DEFAULT 0,
  total_rides INT NOT NULL DEFAULT 0,
  new_rides INT NOT NULL DEFAULT 0,
  total_bookings INT NOT NULL DEFAULT 0,
  new_bookings INT NOT NULL DEFAULT 0,
  active_reports INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Pattern 1: Dual-Reveal Review Mechanism

**What:** Reviews are invisible until both parties have submitted, or the 14-day deadline passes. Controlled by the `revealed_at` column.
**When to use:** Every review insert.
**Why:** Prevents retaliation reviews (party B cannot see party A's review before writing their own).

```sql
-- Trigger: when a review is inserted, check if the counter-review already exists
-- If so, reveal BOTH reviews immediately
CREATE OR REPLACE FUNCTION public.check_review_reveal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_counter_review_id UUID;
BEGIN
  -- Find the counter-review (same booking, different reviewer)
  SELECT id INTO v_counter_review_id
  FROM public.reviews
  WHERE booking_id = NEW.booking_id
    AND reviewer_id = NEW.reviewee_id  -- The other party reviewed the new reviewer
    AND reviewee_id = NEW.reviewer_id
    AND revealed_at IS NULL;

  IF v_counter_review_id IS NOT NULL THEN
    -- Both reviews exist: reveal both
    UPDATE public.reviews
    SET revealed_at = now()
    WHERE id IN (NEW.id, v_counter_review_id)
      AND revealed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_review_reveal();
```

```sql
-- pg_cron job: reveal reviews older than 14 days where only one party rated
-- Runs daily at 3 AM
SELECT cron.schedule(
  'reveal-expired-reviews',
  '0 3 * * *',
  $$
    UPDATE public.reviews
    SET revealed_at = now()
    WHERE revealed_at IS NULL
      AND created_at < now() - interval '14 days';
  $$
);
```

### Pattern 2: Rating Aggregation Trigger

**What:** When a review is revealed, update the reviewee's `rating_avg` and `rating_count` on their profile.
**When to use:** Every time `revealed_at` is set (via trigger or cron).

```sql
CREATE OR REPLACE FUNCTION public.update_rating_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Only recalculate when a review becomes revealed
  IF NEW.revealed_at IS NOT NULL AND (OLD.revealed_at IS NULL OR TG_OP = 'INSERT') THEN
    UPDATE public.profiles
    SET
      rating_avg = sub.avg_rating,
      rating_count = sub.cnt
    FROM (
      SELECT
        AVG(rating)::NUMERIC(3,2) AS avg_rating,
        COUNT(*) AS cnt
      FROM public.reviews
      WHERE reviewee_id = NEW.reviewee_id
        AND revealed_at IS NOT NULL
    ) sub
    WHERE id = NEW.reviewee_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_revealed
  AFTER INSERT OR UPDATE OF revealed_at ON public.reviews
  FOR EACH ROW
  WHEN (NEW.revealed_at IS NOT NULL)
  EXECUTE FUNCTION public.update_rating_aggregates();
```

### Pattern 3: Submit Review RPC

**What:** SECURITY DEFINER RPC that validates the user can review, creates the review, and returns whether both parties have now reviewed (for UI feedback).
**When to use:** All review submissions.

```sql
CREATE OR REPLACE FUNCTION public.submit_review(
  p_booking_id UUID,
  p_rating INT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_review_id UUID;
  v_booking RECORD;
  v_other_user_id UUID;
  v_ride_completed_at TIMESTAMPTZ;
  v_both_reviewed BOOLEAN := false;
BEGIN
  -- Fetch booking details
  SELECT b.id, b.ride_id, b.passenger_id, b.status,
         r.driver_id, r.updated_at AS ride_completed_at
  INTO v_booking
  FROM public.bookings b
  JOIN public.rides r ON r.id = b.ride_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Must be completed
  IF v_booking.status != 'completed' THEN
    RAISE EXCEPTION 'Can only rate completed rides';
  END IF;

  -- Must be a participant
  IF v_user_id != v_booking.passenger_id AND v_user_id != v_booking.driver_id THEN
    RAISE EXCEPTION 'Not a participant in this booking';
  END IF;

  -- Determine the other party
  IF v_user_id = v_booking.passenger_id THEN
    v_other_user_id := v_booking.driver_id;
  ELSE
    v_other_user_id := v_booking.passenger_id;
  END IF;

  -- Check 14-day window
  IF v_booking.ride_completed_at + interval '14 days' < now() THEN
    RAISE EXCEPTION 'Rating window has expired (14 days)';
  END IF;

  -- Check for existing review
  IF EXISTS (
    SELECT 1 FROM public.reviews
    WHERE booking_id = p_booking_id AND reviewer_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already reviewed this ride';
  END IF;

  -- Insert review
  INSERT INTO public.reviews (booking_id, ride_id, reviewer_id, reviewee_id, rating, comment)
  VALUES (p_booking_id, v_booking.ride_id, v_user_id, v_other_user_id, p_rating, p_comment)
  RETURNING id INTO v_review_id;

  -- Check if both parties have now reviewed (for UI feedback)
  v_both_reviewed := EXISTS (
    SELECT 1 FROM public.reviews
    WHERE booking_id = p_booking_id AND reviewer_id = v_other_user_id
  );

  RETURN jsonb_build_object(
    'review_id', v_review_id,
    'both_reviewed', v_both_reviewed
  );
END;
$$;
```

### Pattern 4: Block-Aware Search Query

**What:** Modify the existing `nearby_rides` RPC to exclude rides involving blocked users.
**When to use:** All ride search queries.

```sql
-- Add block filtering to the existing nearby_rides function
-- In the WHERE clause, add:
AND NOT EXISTS (
  SELECT 1 FROM public.user_blocks
  WHERE (blocker_id = auth.uid() AND blocked_id = r.driver_id)
     OR (blocker_id = r.driver_id AND blocked_id = auth.uid())
)
```

### Pattern 5: Admin Role via Custom Claims

**What:** Use Supabase `raw_app_meta_data` to store `is_admin: true` in the JWT. Check this in RLS policies and Next.js middleware.
**When to use:** All admin-related access control.
**Why:** Simplest approach for a single role. No extra tables. JWT-embedded so no additional queries.

```sql
-- Helper function to check admin status from JWT
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  );
$$;

-- Bootstrap first admin user (run in Supabase SQL Editor):
-- UPDATE auth.users
-- SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'::jsonb
-- WHERE id = 'YOUR_USER_UUID';
```

```typescript
// Next.js middleware for /admin route protection
// apps/web/middleware.ts - extend existing middleware
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// In the middleware function, add:
if (request.nextUrl.pathname.startsWith('/admin')) {
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user?.app_metadata?.is_admin === true;
  if (!isAdmin) {
    return NextResponse.redirect(new URL('/', request.url));
  }
}
```

### Pattern 6: Admin RLS Policies

**What:** RLS policies that allow admins to read/write moderation tables.

```sql
-- Reports: reporters can see their own, admins can see all
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.is_admin());

-- Reviews: public read (revealed only), users can insert own, admins can update (hide/delete)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view revealed reviews" ON public.reviews
  FOR SELECT TO authenticated
  USING (revealed_at IS NOT NULL OR reviewer_id = auth.uid());

CREATE POLICY "Users can insert own reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- Admins need UPDATE to hide reviews and DELETE for removal
CREATE POLICY "Admins can update reviews" ON public.reviews
  FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete reviews" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Blocks: users manage their own
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blocks" ON public.user_blocks
  FOR ALL TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- Moderation actions: admins only + users can see actions against them (transparency)
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage moderation actions" ON public.moderation_actions
  FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can view actions on themselves" ON public.moderation_actions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Platform stats: admin only
ALTER TABLE public.platform_stats_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view stats" ON public.platform_stats_daily
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Log tables: add admin read access (currently no user policies)
CREATE POLICY "Admins can view notification logs" ON public.log_notifications
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view email logs" ON public.log_emails
  FOR SELECT TO authenticated
  USING (public.is_admin());
```

### Pattern 7: Platform Stats Aggregation (pg_cron)

**What:** Daily cron job that snapshots platform metrics into `platform_stats_daily`.
**When to use:** Admin dashboard trend graphs.

```sql
-- Runs daily at 1 AM
SELECT cron.schedule(
  'daily-platform-stats',
  '0 1 * * *',
  $$
    INSERT INTO public.platform_stats_daily (date, total_users, new_users, total_rides, new_rides, total_bookings, new_bookings, active_reports)
    VALUES (
      CURRENT_DATE - 1,
      (SELECT COUNT(*) FROM public.profiles),
      (SELECT COUNT(*) FROM public.profiles WHERE created_at::date = CURRENT_DATE - 1),
      (SELECT COUNT(*) FROM public.rides),
      (SELECT COUNT(*) FROM public.rides WHERE created_at::date = CURRENT_DATE - 1),
      (SELECT COUNT(*) FROM public.bookings),
      (SELECT COUNT(*) FROM public.bookings WHERE created_at::date = CURRENT_DATE - 1),
      (SELECT COUNT(*) FROM public.reports WHERE status IN ('open', 'reviewing'))
    )
    ON CONFLICT (date) DO UPDATE SET
      total_users = EXCLUDED.total_users,
      new_users = EXCLUDED.new_users,
      total_rides = EXCLUDED.total_rides,
      new_rides = EXCLUDED.new_rides,
      total_bookings = EXCLUDED.total_bookings,
      new_bookings = EXCLUDED.new_bookings,
      active_reports = EXCLUDED.active_reports;
  $$
);
```

### Pattern 8: Completed Rides Counter Trigger

**What:** Increment `profiles.completed_rides_count` when a booking is marked completed. Used for the "Experienced" badge (10+ rides).

```sql
CREATE OR REPLACE FUNCTION public.update_completed_rides_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Booking completed: increment count for passenger
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.profiles
    SET completed_rides_count = COALESCE(completed_rides_count, 0) + 1
    WHERE id = NEW.passenger_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_booking_completed_count
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.update_completed_rides_count();
```

Note: The driver's completed rides count is already tracked by `get_driver_reliability` RPC. For the "Experienced" badge, we also need to count for drivers. The `complete_ride` RPC already completes all bookings, so the trigger above handles passengers. For drivers, add a similar trigger on the `rides` table when status changes to 'completed'.

### Recommended Project Structure

```
supabase/migrations/
├── 00000000000029_reviews.sql              # reviews table, indexes, dual-reveal trigger
├── 00000000000030_reports_blocks.sql       # reports, user_blocks, moderation_actions tables
├── 00000000000031_admin_role.sql           # is_admin() function, admin RLS policies
├── 00000000000032_review_rpcs.sql          # submit_review, get_reviews_for_user RPCs
├── 00000000000033_report_block_rpcs.sql    # report_user, block_user, unblock_user RPCs
├── 00000000000034_admin_rpcs.sql           # Admin moderation RPCs (warn, suspend, ban)
├── 00000000000035_rating_aggregation.sql   # rating_avg trigger, completed_rides_count
├── 00000000000036_review_reveal_cron.sql   # pg_cron for 14-day deadline reveal
├── 00000000000037_platform_stats.sql       # stats table + daily cron job
├── 00000000000038_block_aware_search.sql   # Update nearby_rides to filter blocked users

packages/shared/src/
├── constants/review.ts                     # REVIEW constants (max comment length, deadline)
├── constants/moderation.ts                 # Moderation action types, account statuses
├── validation/review.ts                    # SubmitReview, ReportUser Zod schemas
├── queries/reviews.ts                      # getReviewsForUser, getPendingReviews query builders

apps/web/app/(app)/
├── components/
│   ├── rating-modal.tsx                    # Post-ride rating modal (1-5 stars + comment)
│   ├── review-card.tsx                     # Individual review display
│   ├── review-list.tsx                     # Review list for profile page
│   ├── report-dialog.tsx                   # Report user dialog (free text)
│   ├── block-button.tsx                    # Block/unblock user button
│   └── experienced-badge.tsx              # "Experienced" badge component
├── profile/[id]/page.tsx                   # Updated: show reviews section, report/block buttons
├── settings/
│   └── blocked-users/
│       └── page.tsx                        # Blocked users list with unblock
├── admin/
│   ├── layout.tsx                          # Admin layout with sidebar nav
│   ├── page.tsx                            # Dashboard: platform stats overview
│   ├── reports/
│   │   ├── page.tsx                        # Reports list (filterable by status)
│   │   └── [id]/page.tsx                   # Report detail with resolution actions
│   ├── users/
│   │   ├── page.tsx                        # User search/list for moderation
│   │   └── [id]/page.tsx                   # User detail: history, actions, warn/suspend/ban
│   ├── reviews/
│   │   └── page.tsx                        # Flagged/reported reviews management
│   └── components/
│       ├── stats-cards.tsx                 # Summary stat cards
│       ├── trend-chart.tsx                 # Daily/weekly trend line charts
│       ├── admin-sidebar.tsx              # Admin navigation sidebar
│       └── moderation-action-form.tsx     # Warn/suspend/ban form
```

### Anti-Patterns to Avoid

- **Storing average rating only in reviews table:** Always keep the denormalized `rating_avg` and `rating_count` on the profiles table (already exists). Calculating averages on every profile/ride-card render is expensive. Use triggers to keep the denormalized values in sync.
- **Checking admin role on every render via database query:** Use JWT `app_metadata.is_admin` which is already in the token. No extra database call needed. Only requires middleware check + RLS policies.
- **Using client-side filtering for blocks:** Blocked user filtering MUST happen server-side (in RPC functions and RLS policies). Client-side filtering exposes that the blocked user's rides exist.
- **Allowing reviews on non-completed bookings:** The `submit_review` RPC must enforce `booking.status = 'completed'`. RLS alone cannot check cross-table conditions, so this must be in the RPC.
- **Mutable reviews:** Per user decision, reviews cannot be edited or deleted. Do NOT add UPDATE policies for regular users on reviews table.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rating average calculation | Manual increment/decrement logic | PostgreSQL trigger with `AVG()` query | Triggers are atomic and cannot drift out of sync |
| Review visibility timer | Application-level setTimeout or polling | pg_cron daily job updating `revealed_at` | Serverless, reliable, already used in project |
| Admin role checking | Custom JWT middleware from scratch | Supabase `app_metadata` + `auth.jwt()` in RLS | Built into Supabase auth, no extra infrastructure |
| Platform stats aggregation | Real-time COUNT queries on large tables | Pre-computed `platform_stats_daily` table via pg_cron | COUNT(*) on growing tables gets slow; daily snapshots are O(1) reads |
| Block filtering in search | Post-query client-side filter | SQL `NOT EXISTS` subquery in `nearby_rides` RPC | Server-side ensures blocked content never reaches the client |

**Key insight:** The dual-reveal pattern is the most architecturally interesting piece. The `revealed_at` column approach is clean because it reduces all visibility logic to a single NULL check (`WHERE revealed_at IS NOT NULL`), and both trigger-based reveal (when both parties rate) and cron-based reveal (14-day deadline) set the same column.

## Common Pitfalls

### Pitfall 1: Rating Modal Not Shown After Ride Completion
**What goes wrong:** Driver completes the ride via `complete_ride` RPC, the page redirects to ride detail, but no rating modal appears.
**Why it happens:** The completion redirect happens before the UI can show the modal. No state is passed to indicate "just completed."
**How to avoid:** After `complete_ride` succeeds, redirect to `/rides/{id}?justCompleted=true`. The ride detail page reads this query param and shows the rating modal. Store `pendingRatings` in localStorage for the "next app open" reminder.
**Warning signs:** Users never rate because they never see the prompt.

### Pitfall 2: Dual-Reveal Trigger Race Condition
**What goes wrong:** Both users submit reviews simultaneously. Each trigger fires, each finds no counter-review yet, so neither reveals.
**Why it happens:** Two concurrent transactions, each seeing the pre-insert state.
**How to avoid:** Use `FOR UPDATE` on the counter-review query in the trigger to serialize concurrent inserts for the same booking. Or use a SERIALIZABLE isolation level. The trigger should also handle the case where the NEW row already has `revealed_at` set.
**Warning signs:** Both reviews exist but neither has `revealed_at` set.

### Pitfall 3: Stale Rating Display After Review Reveal
**What goes wrong:** Profile page shows old `rating_avg` even though new reviews were just revealed.
**Why it happens:** The aggregation trigger fires but the client has cached data.
**How to avoid:** When a review is submitted and `both_reviewed = true` is returned, invalidate the reviewee's profile cache (TanStack Query). For cron-revealed reviews, the next profile page load will fetch fresh data naturally.

### Pitfall 4: Blocked User Can Still Access Existing Conversations
**What goes wrong:** User A blocks User B, but B can still send messages in their existing chat conversation.
**How to avoid:** Add a block check in the `send_chat_message` RPC -- before inserting a message, verify no block exists between the sender and the other conversation participant. The check should be: `NOT EXISTS (SELECT 1 FROM user_blocks WHERE ...)`.

### Pitfall 5: Admin Banning Without Handling Active Rides
**What goes wrong:** Admin bans a user, but their active rides remain visible and bookable.
**Why it happens:** Ban only changes `account_status` on profile, doesn't cascade to rides.
**How to avoid:** The ban RPC should accept an `auto_cancel_rides` parameter (per user decision -- admin decides per case). If true, cancel all upcoming rides and their bookings. If false, rides stand but the user cannot post new ones.

### Pitfall 6: Suspension Not Auto-Expiring
**What goes wrong:** User is suspended for 7 days but remains suspended after the period.
**Why it happens:** No mechanism to automatically lift the suspension.
**How to avoid:** Use pg_cron to check for expired suspensions (where `suspended_until < now()` and `account_status = 'suspended'`), and reset them to 'active'. Run every 15 minutes.

### Pitfall 7: Rating Prompt Showing for Expired Windows
**What goes wrong:** A user opens the app 20 days after a ride and sees a rating prompt.
**Why it happens:** The pending rating check does not filter by the 14-day window.
**How to avoid:** When querying for pending ratings (bookings where the user hasn't reviewed yet), always filter: `ride.updated_at + interval '14 days' > now()`.

### Pitfall 8: Admin Page Not Protected by RLS
**What goes wrong:** Non-admin user navigates to `/admin` and sees data they shouldn't.
**Why it happens:** Only middleware is used for route protection, but data queries don't enforce admin access.
**How to avoid:** Always use BOTH middleware (for route protection) AND RLS policies (for data protection). Middleware is a convenience; RLS is the security layer. Admin data tables should have RLS policies checking `is_admin()`.

## Code Examples

### Rating Modal Component Pattern

```typescript
// Post-ride rating modal -- appears after driver completes ride
// or when passenger visits a completed ride they haven't rated

interface RatingModalProps {
  bookingId: string;
  otherUserName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

async function handleSubmit(rating: number, comment: string) {
  const { data, error } = await supabase.rpc('submit_review', {
    p_booking_id: bookingId,
    p_rating: rating,
    p_comment: comment || null,
  });

  if (error) {
    if (error.message.includes('already reviewed')) {
      toast.error('You have already rated this ride');
    } else if (error.message.includes('window has expired')) {
      toast.error('The rating window has expired (14 days)');
    } else {
      toast.error('Failed to submit rating');
    }
    return;
  }

  toast.success('Rating submitted!');
  if (data?.both_reviewed) {
    toast.info('Both ratings are now visible on your profiles');
  }
  onSubmitted();
}
```

### Fetching Revealed Reviews for Profile

```typescript
// packages/shared/src/queries/reviews.ts
export function getReviewsForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  return supabase
    .from('reviews')
    .select(`
      id, rating, comment, created_at, revealed_at,
      reviewer:reviewer_id(display_name, avatar_url)
    `)
    .eq('reviewee_id', userId)
    .not('revealed_at', 'is', null)
    .order('created_at', { ascending: false });
}
```

### Pending Reviews Query (for rating reminders)

```typescript
// packages/shared/src/queries/reviews.ts
export function getPendingReviews(
  supabase: SupabaseClient,
  userId: string,
) {
  // Find completed bookings where this user hasn't submitted a review
  // and the 14-day window hasn't expired
  return supabase
    .from('bookings')
    .select(`
      id, ride_id, passenger_id,
      rides!inner(
        id, driver_id, origin_address, destination_address,
        departure_time, updated_at,
        profiles!rides_driver_id_fkey(display_name, avatar_url)
      )
    `)
    .eq('status', 'completed')
    .or(`passenger_id.eq.${userId},rides.driver_id.eq.${userId}`)
    .gt('rides.updated_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .not('id', 'in',
      // Subquery: bookings already reviewed by this user
      `(SELECT booking_id FROM reviews WHERE reviewer_id = '${userId}')`
    );
}
```

Note: The pending reviews query above is complex and may not work cleanly with PostgREST filters. An RPC function is recommended instead:

```sql
CREATE OR REPLACE FUNCTION public.get_pending_reviews()
RETURNS TABLE (
  booking_id UUID,
  ride_id UUID,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  origin_address TEXT,
  destination_address TEXT,
  ride_completed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    b.id AS booking_id,
    b.ride_id,
    CASE WHEN b.passenger_id = auth.uid() THEN r.driver_id ELSE b.passenger_id END AS other_user_id,
    p.display_name AS other_user_name,
    p.avatar_url AS other_user_avatar,
    r.origin_address,
    r.destination_address,
    r.updated_at AS ride_completed_at
  FROM public.bookings b
  JOIN public.rides r ON r.id = b.ride_id
  JOIN public.profiles p ON p.id = (
    CASE WHEN b.passenger_id = auth.uid() THEN r.driver_id ELSE b.passenger_id END
  )
  WHERE b.status = 'completed'
    AND (b.passenger_id = auth.uid() OR r.driver_id = auth.uid())
    AND r.updated_at + interval '14 days' > now()
    AND NOT EXISTS (
      SELECT 1 FROM public.reviews rv
      WHERE rv.booking_id = b.id AND rv.reviewer_id = auth.uid()
    );
$$;
```

### Block/Unblock RPC

```sql
CREATE OR REPLACE FUNCTION public.block_user(p_blocked_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() = p_blocked_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (auth.uid(), p_blocked_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_user(p_blocked_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.user_blocks
  WHERE blocker_id = auth.uid() AND blocked_id = p_blocked_id;
END;
$$;
```

### Admin Moderation RPCs

```sql
-- Warn a user
CREATE OR REPLACE FUNCTION public.admin_warn_user(
  p_user_id UUID,
  p_reason TEXT,
  p_report_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_action_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  INSERT INTO public.moderation_actions (user_id, admin_id, action_type, reason, report_id)
  VALUES (p_user_id, auth.uid(), 'warning', p_reason, p_report_id)
  RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$;

-- Suspend a user
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_user_id UUID,
  p_reason TEXT,
  p_duration_days INT,
  p_report_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_action_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  v_expires_at := now() + (p_duration_days || ' days')::interval;

  UPDATE public.profiles
  SET account_status = 'suspended', suspended_until = v_expires_at
  WHERE id = p_user_id;

  INSERT INTO public.moderation_actions (user_id, admin_id, action_type, reason, expires_at, report_id)
  VALUES (p_user_id, auth.uid(), 'suspension', p_reason, v_expires_at, p_report_id)
  RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$;

-- Ban a user
CREATE OR REPLACE FUNCTION public.admin_ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_cancel_rides BOOLEAN DEFAULT false,
  p_report_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_action_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  UPDATE public.profiles
  SET account_status = 'banned'
  WHERE id = p_user_id;

  IF p_cancel_rides THEN
    -- Cancel all upcoming rides by this user
    UPDATE public.rides
    SET status = 'cancelled', updated_at = now()
    WHERE driver_id = p_user_id AND status = 'upcoming';

    -- Cancel all confirmed/pending bookings on those rides
    UPDATE public.bookings
    SET status = 'cancelled',
        cancelled_by = auth.uid(),
        cancellation_reason = 'User banned by admin',
        cancelled_at = now(),
        updated_at = now()
    WHERE ride_id IN (
      SELECT id FROM public.rides WHERE driver_id = p_user_id
    ) AND status IN ('pending', 'confirmed');
  END IF;

  INSERT INTO public.moderation_actions (user_id, admin_id, action_type, reason, report_id)
  VALUES (p_user_id, auth.uid(), 'ban', p_reason, p_report_id)
  RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$;
```

## Existing Code That Needs Modification

### 1. Profile page (`apps/web/app/(app)/profile/[id]/page.tsx`)
Currently shows a placeholder ratings section with `rating_avg` and `rating_count` only. Must be extended to:
- Show individual review cards with reviewer name, stars, comment, date
- Add "Experienced" badge when `completed_rides_count >= 10`
- Add Report and Block buttons (visible on other users' profiles, not own)
- Show pending rating prompt if viewing own profile

### 2. Ride detail page / manage page
After `complete_ride` succeeds in `manage-ride-content.tsx`, redirect with `?justCompleted=true` to trigger rating modal. The ride detail page needs to detect this param and show the rating modal.

### 3. nearby_rides RPC (`supabase/migrations/00000000000012_ride_search_rpc.sql`)
Must add `NOT EXISTS (SELECT 1 FROM user_blocks ...)` filter to exclude blocked users from search results.

### 4. Booking RPCs (`supabase/migrations/00000000000015_booking_rpcs.sql`)
Add block check in `book_ride_instant` and `request_ride_booking` -- prevent booking rides of blocked/blocking users.

### 5. Chat RPC (`supabase/migrations/00000000000024_chat_rpcs.sql`)
Add block check in `send_chat_message` -- prevent messaging blocked users.

### 6. Send-notification Edge Function (`supabase/functions/send-notification/index.ts`)
Add `new_report` notification type for admin alerts when reports are submitted.

### 7. Notification preferences (`supabase/functions/_shared/notifications.ts`)
Add `new_report` to the `NotificationType` union (admin-only notification).

### 8. App navigation (`apps/web/app/(app)/app-nav.tsx`)
No changes needed for regular users. Admin panel is at `/admin` which has its own layout.

### 9. Middleware (`apps/web/middleware.ts`)
Add `/admin` route protection checking `app_metadata.is_admin`.

### 10. Suspended user handling
Add a check in the app layout or middleware: if `account_status = 'suspended'`, show a suspension banner with expiry date and restrict ride posting/booking actions.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase `user_roles` table for RBAC | `raw_app_meta_data` custom claims in JWT | Available since Supabase v2 | Simpler for single-role, no extra query |
| Separate admin app deployment | `/admin` route in same Next.js app | Standard practice | Simpler deployment, shared auth |
| Manual rating recalculation | PostgreSQL trigger on review insert/reveal | Standard pattern | Atomic, never drifts |
| Application cron for review reveal | pg_cron in PostgreSQL | Already used in project | No extra infrastructure |

## Open Questions

1. **Admin notification for new reports**
   - What we know: Admins should receive push + email when new reports come in
   - What's unclear: How to target "all admins" for notifications -- OneSignal doesn't know about admin role
   - Recommendation: Create a database trigger on `reports` INSERT that queries for admin users (`app_metadata.is_admin = true`) and calls `_notify()` for each. Or use a OneSignal segment tagged as "admin" -- but this requires tagging admins in OneSignal. Simpler: query admin users in the trigger.

2. **Review content moderation**
   - What we know: Admins can hide/delete offensive reviews
   - What's unclear: Should hiding a review also affect the rating average, or just hide the text?
   - Recommendation: Two options for admins: (a) "Hide review" -- sets `revealed_at = NULL` which hides it and removes it from the rating average (via trigger recalculation), (b) "Delete review" -- permanently removes it. Option (a) is reversible, option (b) is not. Default to (a) with (b) for severe cases.

3. **Recharts bundle size**
   - What we know: recharts is ~300KB gzipped
   - What's unclear: Whether this is acceptable for the admin panel
   - Recommendation: Use dynamic import (`next/dynamic`) for the admin panel charts so recharts is only loaded on admin pages. Regular users never download this bundle.

4. **Experienced badge threshold**
   - What we know: 10+ completed rides earns "Experienced" badge
   - What's unclear: Should this count rides as driver, passenger, or both?
   - Recommendation: Count both. A user with 10 rides (any role) has demonstrated platform engagement and trustworthiness. The `completed_rides_count` column tracks passenger completions; for drivers, count from `rides` table where `status = 'completed'`. Or keep it simple: `completed_rides_count` increments for BOTH driver and passenger when a ride completes.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: profiles table (`00000000000001_profiles.sql`), bookings table (`00000000000014_bookings.sql`), booking RPCs (`00000000000015_booking_rpcs.sql`), notification triggers (`00000000000025_notification_triggers.sql`), send-notification Edge Function, profile page (`profile/[id]/page.tsx`), ride-card component, manage-ride-content component
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) - Admin role patterns
- [Supabase Community Custom Claims](https://github.com/supabase-community/supabase-custom-claims) - `app_metadata` approach for JWT claims
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS policy patterns

### Secondary (MEDIUM confidence)
- [Supabase Discussion: Best way to implement RBAC](https://github.com/orgs/supabase/discussions/346) - Community patterns for role-based access
- [MakerKit: RBAC with Next.js Supabase](https://makerkit.dev/docs/next-supabase-turbo/development/permissions-and-roles) - Middleware + RLS dual protection pattern
- BlaBlaCar review system analysis (from user requirements and general knowledge of BlaBlaCar patterns)

### Tertiary (LOW confidence)
- recharts bundle size estimate (~300KB) - based on general community reports, should verify with actual bundle analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed except recharts for admin charts; all patterns use existing Supabase + PostgreSQL capabilities
- Architecture (reviews/ratings): HIGH - Dual-reveal with `revealed_at` column is clean and well-understood; triggers and pg_cron are already used in the project
- Architecture (admin panel): HIGH - `app_metadata` custom claims for admin role is the officially recommended simple approach; middleware + RLS dual protection is standard
- Architecture (blocking): HIGH - `NOT EXISTS` subquery in existing RPCs is straightforward
- Pitfalls: HIGH - Based on real patterns from the codebase and standard race condition / visibility concerns

**Research date:** 2026-02-15
**Valid until:** 2026-03-17 (30 days - stable domain, no fast-moving library changes)
