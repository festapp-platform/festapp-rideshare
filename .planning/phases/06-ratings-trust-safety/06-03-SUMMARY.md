---
phase: 06-ratings-trust-safety
plan: 03
subsystem: ui
tags: [react, rating-modal, star-rating, reviews, profile, ride-detail, pending-reviews]

# Dependency graph
requires:
  - phase: 06-ratings-trust-safety
    provides: "06-01 reviews table, submit_review/get_pending_reviews RPCs, dual-reveal trigger"
  - phase: 06-ratings-trust-safety
    provides: "06-02 shared constants (REVIEW_MAX_COMMENT_LENGTH, EXPERIENCED_BADGE_THRESHOLD), query builders (getReviewsForUser, getExistingReview), PendingReview type"
  - phase: 04-bookings-management
    provides: "complete_ride RPC, booking status, ride detail page"
provides:
  - "RatingModal component with 1-5 star picker, comment textarea, submit_review RPC integration"
  - "ReviewCard and ReviewList components for profile page review display"
  - "StarRating reusable component with sm/md sizes and 'New' label for unrated users"
  - "ExperiencedBadge amber pill badge for 10+ completed rides"
  - "PendingRatingBanner app-level pending review detection with session-dismissable UI"
  - "Rating modal trigger via justCompleted query param on ride detail page"
  - "Profile page with ReviewList, ExperiencedBadge, StarRating, and pending reviews banner"
affects: [06-04-report-block-ui, 06-05-admin-moderation-panel]

# Tech tracking
tech-stack:
  added: []
  patterns: [justCompleted-query-param-trigger, session-dismissable-banner, star-rating-reuse]

key-files:
  created:
    - apps/web/app/(app)/components/rating-modal.tsx
    - apps/web/app/(app)/components/review-card.tsx
    - apps/web/app/(app)/components/review-list.tsx
    - apps/web/app/(app)/components/experienced-badge.tsx
    - apps/web/app/(app)/components/star-rating.tsx
    - apps/web/app/(app)/components/pending-rating-banner.tsx
  modified:
    - apps/web/app/(app)/profile/[id]/page.tsx
    - apps/web/app/(app)/rides/[id]/page.tsx
    - apps/web/app/(app)/components/ride-detail.tsx
    - apps/web/app/(app)/components/ride-card.tsx
    - apps/web/app/(app)/rides/[id]/manage/manage-ride-content.tsx
    - apps/web/app/(app)/layout.tsx

key-decisions:
  - "StarRating component with sm/md variants replaces inline star SVG rendering across ride cards and profile"
  - "justCompleted query param triggers rating modal on ride detail page after ride completion"
  - "PendingRatingBanner uses sessionStorage for dismiss state to avoid repeated nagging within same session"
  - "Ride detail page determines rating eligibility server-side to avoid client-side waterfall"

patterns-established:
  - "Rating trigger pattern: complete_ride -> redirect with ?justCompleted=true -> server checks review status -> client shows modal"
  - "Session-dismissable banner pattern: sessionStorage key prevents re-showing within same browser session"
  - "Reusable StarRating: single component for all star rating display with 'New' label fallback"

# Metrics
duration: 5min
completed: 2026-02-15
---

# Phase 6 Plan 03: Rating/Review UI Summary

**Post-ride rating modal with 1-5 star picker, review list on profiles, StarRating component, experienced badge, and pending-rating detection banner**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-15T22:28:10Z
- **Completed:** 2026-02-15T22:33:26Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Rating modal with 1-5 clickable star picker, optional comment (500 char), submit_review RPC, error handling for "already reviewed" and "expired"
- Profile page updated with StarRating (md), ExperiencedBadge for 10+ rides, ReviewList of revealed reviews, and pending reviews banner with inline rating modal
- Ride detail page shows rating modal after completion via justCompleted query param, plus "Rate this ride" button for unreviewed completed rides
- Ride cards use StarRating component in sm format, showing "New" for drivers with 0 ratings
- App-level PendingRatingBanner in layout checks for unrated rides on mount, session-dismissable

## Task Commits

Each task was committed atomically:

1. **Task 1: Rating modal, review card/list, experienced badge, star rating** - `8a868d7` (feat)
2. **Task 2: Integrate into profile, ride detail, ride cards, app layout** - `dbd8890` (feat)

## Files Created/Modified

- `apps/web/app/(app)/components/rating-modal.tsx` - Post-ride rating modal with star picker, comment, submit_review RPC
- `apps/web/app/(app)/components/review-card.tsx` - Individual review card with reviewer avatar, stars, comment, relative date
- `apps/web/app/(app)/components/review-list.tsx` - Review list fetching revealed reviews via getReviewsForUser
- `apps/web/app/(app)/components/experienced-badge.tsx` - Amber "Experienced" pill badge for 10+ completed rides
- `apps/web/app/(app)/components/star-rating.tsx` - Reusable star rating display (sm/md), "New" label for unrated
- `apps/web/app/(app)/components/pending-rating-banner.tsx` - App-level pending rating detection with dismiss
- `apps/web/app/(app)/profile/[id]/page.tsx` - Updated with StarRating, ExperiencedBadge, ReviewList, pending reviews
- `apps/web/app/(app)/rides/[id]/page.tsx` - Added justCompleted param, review eligibility check, new RideDetail props
- `apps/web/app/(app)/components/ride-detail.tsx` - Added RatingModal integration, "Rate this ride" button, justCompleted redirect on complete
- `apps/web/app/(app)/components/ride-card.tsx` - Replaced inline stars with StarRating component
- `apps/web/app/(app)/rides/[id]/manage/manage-ride-content.tsx` - Redirect with ?justCompleted=true after completing ride
- `apps/web/app/(app)/layout.tsx` - Added PendingRatingBanner to main content area

## Decisions Made

- **StarRating reuse:** Created a single StarRating component with sm (inline star + number) and md (5 individual stars + count) variants, replacing all inline star rendering across the app
- **justCompleted trigger pattern:** Server-side ride detail page reads the query param and pre-checks review eligibility, passing boolean props to the client component to avoid client-side waterfall
- **Session-dismissable banner:** PendingRatingBanner uses sessionStorage (not localStorage) so users see the reminder once per session but are not nagged persistently
- **Server-side review check:** Ride detail page checks getExistingReview server-side for both passenger and driver roles to determine if rating modal should appear

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added complete_ride redirect with justCompleted in ride-detail.tsx**
- **Found during:** Task 2
- **Issue:** Plan only mentioned manage-ride-content redirect, but ride-detail.tsx also has a Complete Ride button that needed the same redirect
- **Fix:** Changed `router.refresh()` to `router.push(/rides/${ride.id}?justCompleted=true)` in ride-detail handleComplete
- **Files modified:** apps/web/app/(app)/components/ride-detail.tsx
- **Committed in:** dbd8890 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for consistent rating modal trigger from both completion paths. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All rating/review UI components ready for use
- Report/block UI (06-04) can build on profile page structure (already integrated via linter -- ReportDialog, BlockButton imports present)
- Admin moderation panel (06-05) can reference review display patterns

## Self-Check: PASSED

- [x] apps/web/app/(app)/components/rating-modal.tsx exists
- [x] apps/web/app/(app)/components/review-card.tsx exists
- [x] apps/web/app/(app)/components/review-list.tsx exists
- [x] apps/web/app/(app)/components/experienced-badge.tsx exists
- [x] apps/web/app/(app)/components/star-rating.tsx exists
- [x] apps/web/app/(app)/components/pending-rating-banner.tsx exists
- [x] Commit 8a868d7 exists (Task 1)
- [x] Commit dbd8890 exists (Task 2)

---
*Phase: 06-ratings-trust-safety*
*Completed: 2026-02-15*
