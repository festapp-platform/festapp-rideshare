---
phase: 15-i18n-coverage
plan: 03
subsystem: ui
tags: [i18n, react, translations, cookie-consent, not-found, pwa]

# Dependency graph
requires:
  - phase: 15-02
    provides: Core flow i18n with ~125 translation keys
provides:
  - Full i18n coverage for all secondary UI components (block-button, ride-card, cookie-consent, force-update, pwa-install)
  - Full i18n coverage for all minor UI components (offline-banner, share-button, pending-rating, not-found)
  - Complete translation dictionaries for cs, sk, en locales
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useI18n hook applied to all user-facing components"
    - "not-found.tsx converted to client component for i18n"

key-files:
  created: []
  modified:
    - apps/web/lib/i18n/translations.ts
    - apps/web/app/(app)/components/block-button.tsx
    - apps/web/app/(app)/components/ride-card.tsx
    - apps/web/components/cookie-consent.tsx
    - apps/web/components/force-update-banner.tsx
    - apps/web/app/(app)/components/pwa-install-banner.tsx
    - apps/web/components/offline-banner.tsx
    - apps/web/app/(app)/components/share-button.tsx
    - apps/web/app/(app)/components/pending-rating-banner.tsx
    - apps/web/app/not-found.tsx

key-decisions:
  - "not-found.tsx converted to client component (no server data needs) for useI18n access"
  - "Brand names (Google, Apple) kept untranslated in auth social buttons"

patterns-established:
  - "All user-facing components now use t() for strings -- no hardcoded English"

requirements-completed: [I18N-03, I18N-04, I18N-05]

# Metrics
duration: 6min
completed: 2026-02-17
---

# Phase 15 Plan 03: Secondary & Minor Components i18n Summary

**Full i18n coverage for 9 remaining components with ~30 new translation keys across block, ride-card, cookie-consent, banners, share, and not-found**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-16T23:28:49Z
- **Completed:** 2026-02-16T23:35:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- All 5 secondary UI components fully translated (block-button, ride-card, cookie-consent, force-update-banner, pwa-install-banner)
- All 4 minor UI components fully translated (offline-banner, share-button, pending-rating-banner, not-found)
- Cookie consent banner displays in selected locale (I18N-05)
- 404 not-found page converted to client component and translated
- Final audit confirms no remaining hardcoded English in user-facing components

## Task Commits

Each task was committed atomically:

1. **Task 1: Translate secondary UI components** - `b5649bd` (feat)
2. **Task 2: Translate minor components** - `4d52f94` (feat)

## Files Created/Modified
- `apps/web/lib/i18n/translations.ts` - Added ~30 new translation keys (block, rideCard, cookieConsent, forceUpdate, pwaInstall, offlineBanner, shareButton, pendingRating, notFound namespaces)
- `apps/web/app/(app)/components/block-button.tsx` - Replaced 6 hardcoded strings with t() calls
- `apps/web/app/(app)/components/ride-card.tsx` - Replaced seats left, km, instant/request labels
- `apps/web/components/cookie-consent.tsx` - Replaced message, decline, accept strings
- `apps/web/components/force-update-banner.tsx` - Replaced update message, dismiss, refresh
- `apps/web/app/(app)/components/pwa-install-banner.tsx` - Replaced install message and button
- `apps/web/components/offline-banner.tsx` - Replaced offline message
- `apps/web/app/(app)/components/share-button.tsx` - Replaced copied/share labels
- `apps/web/app/(app)/components/pending-rating-banner.tsx` - Replaced rides to rate message and button
- `apps/web/app/not-found.tsx` - Converted to client component, replaced title/message/button

## Decisions Made
- not-found.tsx converted to client component with "use client" directive since it has no server-side data needs (no generateMetadata with dynamic data, no data fetching)
- Brand names "Google" and "Apple" in social login buttons left as-is (not translated)
- Pre-existing build failure on /vehicles/new (useI18n outside provider during prerender) logged to deferred-items.md -- out of scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing build failure: `/vehicles/new` page fails prerendering due to `useI18n` called outside `I18nProvider` during SSR. Confirmed pre-existing by testing against previous commit. Logged to `deferred-items.md`. TypeScript compilation passes cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 15 (i18n Coverage) is now complete -- all user-facing components translated
- Ready to proceed to Phase 16 or any remaining phases in the v1.1 roadmap

---
*Phase: 15-i18n-coverage*
*Completed: 2026-02-17*

## Self-Check: PASSED

All 10 modified files verified present. Both task commits (b5649bd, 4d52f94) verified in git log.
