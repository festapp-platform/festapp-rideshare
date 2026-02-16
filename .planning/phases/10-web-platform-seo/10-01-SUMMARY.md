---
phase: 10-web-platform-seo
plan: 01
subsystem: ui
tags: [pwa, service-worker, manifest, offline, install-prompt]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: Next.js web app with root layout
provides:
  - PWA manifest with standalone display mode
  - Service worker with cache-first static assets and network-first navigation
  - Offline fallback page
  - Install prompt banner for mobile browsers
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [service-worker cache strategy, beforeinstallprompt event handling]

key-files:
  created:
    - apps/web/public/manifest.json
    - apps/web/public/sw.js
    - apps/web/public/offline.html
    - apps/web/lib/register-sw.ts
    - apps/web/components/pwa-install-prompt.tsx
    - apps/web/app/(app)/components/pwa-install-banner.tsx
  modified:
    - apps/web/app/layout.tsx
    - apps/web/app/(app)/layout.tsx

key-decisions:
  - "SW uses cache-first for static assets, network-first for navigation, network-only for API/Supabase"
  - "SW explicitly excludes OneSignal URLs to avoid interference with push notification worker"
  - "Install banner dismissal persisted to localStorage; standalone mode detection prevents showing to installed users"

patterns-established:
  - "Service worker coexistence: check URL for OneSignal before handling fetch events"
  - "PWA meta tags via Next.js metadata export (manifest, themeColor, appleWebApp)"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 10 Plan 01: PWA Setup Summary

**Installable PWA with manifest, service worker (cache-first statics, network-first navigation, offline fallback), and mobile install banner**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T00:45:09Z
- **Completed:** 2026-02-16T00:47:51Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Web app is installable as a PWA with standalone display mode and app icons
- Service worker caches static assets (cache-first) and serves offline fallback for navigation requests
- Mobile browser users see a bottom install banner with Install/Dismiss actions
- OneSignal push notification worker remains unaffected by new service worker

## Task Commits

Each task was committed atomically:

1. **Task 1: PWA manifest, service worker, and offline fallback** - `108a68f` (feat)
2. **Task 2: PWA install banner for mobile browsers** - `9658289` (feat)

## Files Created/Modified
- `apps/web/public/manifest.json` - PWA manifest with app name, icons, standalone display
- `apps/web/public/sw.js` - Service worker with caching strategies and offline fallback
- `apps/web/public/offline.html` - Standalone offline page with branded retry UI
- `apps/web/lib/register-sw.ts` - Service worker registration utility
- `apps/web/components/pwa-install-prompt.tsx` - Headless component that registers SW on mount
- `apps/web/app/(app)/components/pwa-install-banner.tsx` - Install prompt banner with beforeinstallprompt
- `apps/web/app/layout.tsx` - Added manifest link, theme-color, apple-mobile-web-app meta, PwaInstallPrompt
- `apps/web/app/(app)/layout.tsx` - Added PwaInstallBanner after Toaster

## Decisions Made
- SW uses cache-first for static assets, network-first for navigation, network-only for API/Supabase
- SW explicitly excludes OneSignal URLs to avoid interference with push notification worker
- Install banner dismissal persisted to localStorage; standalone mode detection prevents re-showing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Next.js .next/types cache caused stale validator.ts error on second build; resolved by cleaning .next directory

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PWA foundation in place for SEO and metadata work in subsequent plans
- Icon files at /icons/icon-192.png and /icons/icon-512.png are placeholder paths; actual icons needed before production

---
*Phase: 10-web-platform-seo*
*Completed: 2026-02-16*
