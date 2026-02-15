---
phase: 08-events-flexible-gamification
plan: 04
subsystem: database, ui
tags: [gamification, badges, impact, co2, user-levels, streaks, postgres, react]

requires:
  - phase: 03-rides-search
    provides: nearby_rides RPC function, ride search infrastructure
  - phase: 04-bookings-management
    provides: bookings table, ride completion flow
  - phase: 06-reviews-moderation
    provides: reviews table, ExperiencedBadge component, profiles with completed_rides_count

provides:
  - badge_definitions table with 10 seeded achievement badges
  - user_achievements table for earned badges
  - route_streaks table for weekly streak tracking
  - get_user_impact RPC (CO2, money, rides, distance, passengers)
  - get_user_badges and get_route_streaks RPCs
  - Auto-award triggers on ride completion and review submission
  - getUserLevel() shared function for New/Regular/Experienced/Ambassador levels
  - Extended nearby_rides with driver_completed_rides_count
  - Impact dashboard at /impact
  - BadgesSection and LevelBadge reusable components

affects: [profile, search, mobile-app]

tech-stack:
  added: []
  patterns:
    - "getUserLevel() computes level from completedRides + ratingAvg thresholds"
    - "Auto-award badges via ON CONFLICT DO NOTHING for idempotent insertion"
    - "Route streaks use ISO week comparison for consecutive detection"
    - "LevelBadge has small (ride cards) and large (profile) variants"

key-files:
  created:
    - supabase/migrations/00000000000035_gamification.sql
    - packages/shared/src/constants/gamification.ts
    - packages/shared/src/validation/gamification.ts
    - packages/shared/src/queries/gamification.ts
    - apps/web/app/(app)/impact/page.tsx
    - apps/web/app/(app)/impact/impact-dashboard.tsx
    - apps/web/app/(app)/profile/components/badges-section.tsx
    - apps/web/app/(app)/profile/components/level-badge.tsx
  modified:
    - packages/shared/src/types/database.ts
    - packages/shared/src/index.ts
    - apps/web/app/(app)/profile/[id]/page.tsx
    - apps/web/app/(app)/components/ride-card.tsx

key-decisions:
  - "Route streaks use ISO week string comparison instead of date arithmetic for simplicity"
  - "LevelBadge hides 'New' level on ride cards since it's the default and not informative"
  - "Impact CO2 calculation uses EU average 120g CO2/km saved per shared ride"
  - "Badges are always public (visible on any profile) via RLS SELECT for everyone"

patterns-established:
  - "Badge auto-award: trigger checks threshold, INSERT ON CONFLICT DO NOTHING"
  - "Small/large component variants for context-appropriate display"

duration: 6min
completed: 2026-02-16
---

# Phase 08 Plan 04: Gamification Summary

**Achievement badges with auto-award triggers, impact stats (CO2/money/rides), user levels (New to Ambassador), route streaks, and profile/search integration**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-15T23:41:18Z
- **Completed:** 2026-02-15T23:47:20Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Gamification database with badge_definitions (10 badges), user_achievements, and route_streaks tables
- Auto-award badges on ride completion (ride milestones + streak badges) and review submission (first_review + five_star)
- Impact stats RPC calculating CO2 saved, money saved/earned, rides, distance, and passengers carried
- Impact dashboard at /impact with stats cards, badge grid (earned/unearned), route streaks, level progress
- LevelBadge component with small variant for ride cards and large variant with progress bar for profiles
- Extended nearby_rides to include driver_completed_rides_count for computing level in search results

## Task Commits

1. **Task 1: Gamification migration, nearby_rides extension, and shared package** - `3084f0b` (feat)
2. **Task 2: Impact dashboard, badges, and level integration into profile and search** - `478f19a` (feat)

## Files Created/Modified

- `supabase/migrations/00000000000035_gamification.sql` - Badge definitions, achievements, streaks tables, RPCs, triggers, nearby_rides extension
- `packages/shared/src/constants/gamification.ts` - USER_LEVELS, getUserLevel(), CO2_SAVINGS_PER_KM, BADGE_CATEGORIES
- `packages/shared/src/validation/gamification.ts` - UserImpactStats, UserBadge, RouteStreakResult types
- `packages/shared/src/queries/gamification.ts` - getUserImpact, getUserBadges, getRouteStreaks, getAllBadges query builders
- `packages/shared/src/types/database.ts` - Added badge_definitions, user_achievements, route_streaks tables and gamification RPCs
- `packages/shared/src/index.ts` - Export all gamification constants, types, queries
- `apps/web/app/(app)/impact/page.tsx` - Server component fetching impact data
- `apps/web/app/(app)/impact/impact-dashboard.tsx` - Client dashboard with stats, badges, streaks, share button
- `apps/web/app/(app)/profile/components/badges-section.tsx` - Earned badges display for profiles
- `apps/web/app/(app)/profile/components/level-badge.tsx` - User level badge (small/large variants)
- `apps/web/app/(app)/profile/[id]/page.tsx` - Added LevelBadge and BadgesSection to public profile
- `apps/web/app/(app)/components/ride-card.tsx` - Added driver level pill next to driver name

## Decisions Made

- Route streaks use ISO week string comparison (e.g., '2026-W07') instead of date arithmetic for clean consecutive week detection
- LevelBadge hides "New" level on ride cards since it is the default and adds no informational value
- Impact CO2 calculation uses EU average 120g CO2/km saved per shared ride (standard transportation offset)
- Badges are always publicly visible via RLS SELECT for everyone -- they are social proof
- BadgesSection placed between vehicle and reviews sections on profile for visual hierarchy

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing build error in `apps/web/app/(app)/routes/[id]/page.tsx` (missing `route-detail` module from plan 08-03). Not caused by this plan's changes. TypeScript check on gamification files passes cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gamification system fully operational with auto-awarding triggers
- Impact dashboard accessible at /impact
- Level badges visible on profiles and search results
- Ready for plan 08-05 (if any) or next phase

---
*Phase: 08-events-flexible-gamification*
*Completed: 2026-02-16*
