---
phase: 06-ratings-trust-safety
plan: 04
subsystem: ui
tags: [report, block, unblock, profile, settings, moderation, trust-safety]

# Dependency graph
requires:
  - phase: 06-ratings-trust-safety
    provides: "06-01 database with report_user, block_user, unblock_user, get_blocked_users RPCs"
  - phase: 06-ratings-trust-safety
    provides: "06-02 shared ReportUserSchema validation, moderation constants"
  - phase: 06-ratings-trust-safety
    provides: "06-03 rating modal, star rating, review list, experienced badge components"
provides:
  - "ReportDialog component for reporting users with free text description"
  - "BlockButton component with optimistic toggle and confirmation dialog"
  - "Blocked users settings page with list and unblock capability"
  - "Profile page integration: three-dot menu with Report/Block, block banner, suspension banner"
  - "Banned user profile shows 'account suspended' to visitors"
  - "Settings privacy section with Blocked Users link"
affects: [06-05-admin-moderation-panel]

# Tech tracking
tech-stack:
  added: []
  patterns: [three-dot-actions-menu-on-profile, optimistic-block-toggle, ban-guard-on-profile-view]

key-files:
  created:
    - apps/web/app/(app)/components/report-dialog.tsx
    - apps/web/app/(app)/components/block-button.tsx
    - apps/web/app/(app)/settings/blocked-users/page.tsx
  modified:
    - apps/web/app/(app)/profile/[id]/page.tsx
    - apps/web/app/(app)/settings/page.tsx

key-decisions:
  - "Three-dot ellipsis menu for Report/Block actions on profile page (not inline buttons) to keep profile clean"
  - "Block confirmation dialog required before blocking; unblocking is instant (no confirmation)"
  - "Banned users' profiles show 'account suspended' message to visitors; suspended users see banner on their own profile only"
  - "Optimistic UI for block/unblock with revert on error"

patterns-established:
  - "Actions menu pattern: three-dot button with fixed backdrop overlay for closing"
  - "Block check on profile load: query user_blocks table in parallel with profile data"

# Metrics
duration: 4min
completed: 2026-02-15
---

# Phase 6 Plan 04: Report/Block UI Summary

**Report dialog with free text validation, block/unblock button with optimistic toggling and confirmation, blocked users management page, and profile page integration with three-dot actions menu**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-15T22:27:54Z
- **Completed:** 2026-02-15T22:32:22Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- ReportDialog component with 10-2000 char validation, report_user RPC integration, and toast feedback
- BlockButton with optimistic state toggling, confirmation dialog for blocking, instant unblocking
- Blocked users settings page listing all blocked users with unblock and optimistic list removal
- Profile page three-dot menu with Report and Block actions (hidden on own profile)
- Block banner on blocked user profiles with inline unblock button
- Suspension banner on own profile showing expiry date when account is suspended
- Banned user profile shows "account suspended" message to visitors

## Task Commits

Each task was committed atomically:

1. **Task 1: Report dialog, block button, blocked users page** - `0578d5d` (feat)
2. **Task 2: Profile page integration, settings link** - `e1b39cc` (feat)

## Files Created/Modified

- `apps/web/app/(app)/components/report-dialog.tsx` - Report user dialog with free text description and RPC submission
- `apps/web/app/(app)/components/block-button.tsx` - Block/unblock toggle with confirmation dialog and optimistic UI
- `apps/web/app/(app)/settings/blocked-users/page.tsx` - Blocked users list with avatar, date, and unblock button
- `apps/web/app/(app)/profile/[id]/page.tsx` - Added three-dot actions menu, block/suspension banners, banned profile guard
- `apps/web/app/(app)/settings/page.tsx` - Added Privacy section with Blocked Users link

## Decisions Made

- **Three-dot menu for actions:** Used ellipsis icon dropdown menu on profile page for Report and Block actions, keeping the profile layout clean while making actions accessible
- **Block confirmation required:** Users must confirm before blocking (with explanation of consequences); unblocking is instant without confirmation per standard platform pattern
- **Banned profile guard:** Visitors to a banned user's profile see a minimal "account suspended" page; suspended users see a warning banner only on their own profile
- **Optimistic UI everywhere:** Block button, unblock in settings list, and profile block status all use optimistic updates with error revert

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All report/block UI complete and integrated into profile and settings
- Admin panel (06-05) can build on these components for moderation workflow
- Profile page now shows account status, suspension info, and block state

## Self-Check: PASSED

- [x] apps/web/app/(app)/components/report-dialog.tsx exists
- [x] apps/web/app/(app)/components/block-button.tsx exists
- [x] apps/web/app/(app)/settings/blocked-users/page.tsx exists
- [x] Commit 0578d5d exists (Task 1)
- [x] Commit e1b39cc exists (Task 2)

---
*Phase: 06-ratings-trust-safety*
*Completed: 2026-02-15*
