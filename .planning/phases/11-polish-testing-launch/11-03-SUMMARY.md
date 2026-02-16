---
phase: 11-polish-testing-launch
plan: 03
subsystem: infra, ui
tags: [sentry, analytics, gdpr, cookie-consent, force-update, error-monitoring]

requires:
  - phase: 01-foundation-auth
    provides: "Auth system and layout structure"
provides:
  - "Sentry crash reporting with captureError and setUser helpers"
  - "Anonymous analytics with consent gating"
  - "GDPR cookie consent banner"
  - "GDPR data export page"
  - "Force-update banner with version.json"
affects: [production-deployment, monitoring]

tech-stack:
  added: ["@sentry/browser"]
  patterns: ["consent-gated analytics", "no-op initialization pattern", "session-scoped dismissal"]

key-files:
  created:
    - "apps/web/lib/sentry.ts"
    - "apps/web/lib/analytics.ts"
    - "apps/web/lib/force-update.ts"
    - "apps/web/components/cookie-consent.tsx"
    - "apps/web/components/force-update-banner.tsx"
    - "apps/web/components/sentry-init.tsx"
    - "apps/web/app/(app)/settings/data-export/page.tsx"
    - "apps/web/public/version.json"
    - "apps/web/__tests__/gdpr-analytics.test.ts"
  modified:
    - "apps/web/app/layout.tsx"
    - "apps/web/app/(app)/layout.tsx"
    - "apps/web/app/(app)/settings/page.tsx"

key-decisions:
  - "Used @sentry/browser (lightweight) instead of full Next.js Sentry plugin"
  - "Custom analytics with fetch to /api/analytics placeholder — no third-party SDK"
  - "Cookie consent stored in localStorage, force-update dismissal in sessionStorage"

patterns-established:
  - "No-op initialization: Sentry gracefully skips when DSN not set"
  - "Consent-gated tracking: all analytics functions check localStorage before firing"

duration: 5min
completed: 2026-02-16
---

# Phase 11 Plan 3: Crash Reporting, Analytics, GDPR & Force-Update Summary

**Sentry error capture, consent-gated anonymous analytics, GDPR cookie banner + data export, and version-based force-update banner**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-16T01:05:00Z
- **Completed:** 2026-02-16T01:10:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Sentry crash reporting initialized via @sentry/browser with captureError/setUser helpers (no-ops without DSN)
- Anonymous analytics tracking gated behind cookie consent (no PII, no third-party SDK)
- GDPR cookie consent banner in root layout with accept/decline, persisted in localStorage
- GDPR data export page at /settings/data-export downloads all user data as JSON
- Force-update banner checks version.json and prompts refresh when outdated
- 13 unit tests validating consent gating, force-update logic, and Sentry no-op behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Sentry, analytics, cookie consent, force-update infrastructure** - `49ed3d0` (feat)
2. **Task 2: GDPR data export, settings link, unit tests** - `d90a389` (feat)

## Files Created/Modified
- `apps/web/lib/sentry.ts` - Sentry initialization, captureError, setUser helpers
- `apps/web/lib/analytics.ts` - Consent-gated trackPageView and trackEvent
- `apps/web/lib/force-update.ts` - Version comparison and update banner state
- `apps/web/components/cookie-consent.tsx` - GDPR consent banner component
- `apps/web/components/force-update-banner.tsx` - Version update prompt banner
- `apps/web/components/sentry-init.tsx` - Client component for Sentry initialization
- `apps/web/app/(app)/settings/data-export/page.tsx` - GDPR data export page
- `apps/web/public/version.json` - Version configuration for force-update
- `apps/web/__tests__/gdpr-analytics.test.ts` - 13 unit tests
- `apps/web/app/layout.tsx` - Added CookieConsent and SentryInit
- `apps/web/app/(app)/layout.tsx` - Added ForceUpdateBanner
- `apps/web/app/(app)/settings/page.tsx` - Added "Export My Data" to Privacy section

## Decisions Made
- Used @sentry/browser (lightweight) instead of full Next.js Sentry plugin — avoids build complexity, sufficient for basic error capture
- Custom analytics with fetch to /api/analytics placeholder — no third-party SDK, easy to connect to any backend later
- Cookie consent stored in localStorage (persistent), force-update dismissal in sessionStorage (session-scoped)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created SentryInit client component**
- **Found during:** Task 1 (Sentry initialization in layout)
- **Issue:** Root layout is a server component; initSentry() needs to run client-side
- **Fix:** Created separate SentryInit client component that calls initSentry in useEffect
- **Files modified:** apps/web/components/sentry-init.tsx
- **Verification:** Build passes, no SSR errors
- **Committed in:** 49ed3d0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor structural addition to support server/client component boundary. No scope creep.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration.** Sentry requires:
- Set `NEXT_PUBLIC_SENTRY_DSN` environment variable from Sentry Dashboard -> Settings -> Client Keys (DSN)
- Create a Next.js project in Sentry Dashboard -> Projects -> Create Project -> Next.js
- Without DSN, Sentry operates as a no-op (development-safe)

## Next Phase Readiness
- Crash reporting ready for production (just needs DSN env var)
- Analytics infrastructure ready (connect /api/analytics endpoint when needed)
- GDPR compliance satisfied with consent banner and data export
- Force-update mechanism ready (update version.json to trigger)
- Ready for 11-04

---
*Phase: 11-polish-testing-launch*
*Completed: 2026-02-16*
