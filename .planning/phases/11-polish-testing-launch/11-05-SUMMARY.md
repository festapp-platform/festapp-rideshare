---
phase: 11-polish-testing-launch
plan: 05
subsystem: ui, legal, launch
tags: [terms-of-service, privacy-policy, help-faq, donation, invite-friends, app-store-metadata]

requires:
  - phase: 11-01
    provides: "i18n and base UI infrastructure"
provides:
  - "Terms of service page at /terms"
  - "Privacy policy page at /privacy"
  - "Help/FAQ page at /help with accordion sections"
  - "Donation page at /donate with external Ko-fi link"
  - "InviteFriends component with Web Share API + clipboard fallback"
  - "App store metadata for iOS and Android"
affects: [app-store-submission, legal-compliance]

tech-stack:
  added: []
  patterns: ["server component legal pages", "details/summary accordion", "Web Share API with clipboard fallback"]

key-files:
  created:
    - "apps/web/app/(public)/terms/page.tsx"
    - "apps/web/app/(public)/privacy/page.tsx"
    - "apps/web/app/(public)/help/page.tsx"
    - "apps/web/app/(app)/donate/page.tsx"
    - "apps/web/components/invite-friends.tsx"
    - "apps/web/public/store-metadata.json"
    - "apps/web/__tests__/launch-pages.test.ts"
  modified:
    - "apps/web/app/(app)/settings/page.tsx"

key-decisions:
  - "Legal pages are server components (no JS needed) for SEO and performance"
  - "Help/FAQ uses native details/summary elements (no JS accordion library)"
  - "Invite friends shares via Web Share API first, clipboard fallback second (matching ShareButton pattern)"
  - "Settings page legal link goes to /terms (not /legal) as the entry point for legal info"

patterns-established:
  - "Public legal pages as server components under (public) route group"
  - "details/summary for zero-JS accordion FAQ sections"

duration: 5min
completed: 2026-02-16
---

# Phase 11 Plan 5: Launch Pages, Legal, Help/FAQ, Donation & App Store Assets Summary

**Legal pages (ToS, privacy), help/FAQ, donation prompt, invite-friends, and app store metadata for launch preparation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-16T02:15:00Z
- **Completed:** 2026-02-16T02:20:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Terms of service at /terms with 11 comprehensive sections (eligibility, responsibilities, cost sharing, liability, etc.)
- Privacy policy at /privacy with GDPR-compliant disclosures (data collection, rights, third parties, deletion)
- Help/FAQ at /help with 15 questions across 5 categories using native details/summary accordion
- Donation page at /donate with external Ko-fi link and Coffee icon
- InviteFriends component with Web Share API + clipboard fallback (matches ShareButton pattern)
- Settings page updated: legal -> /terms, added "Invite Friends" and "Support Us" items
- App store metadata JSON for both iOS and Android with descriptions, keywords, and links
- 14 unit tests validating store metadata structure, character limits, page existence, version.json, and SITE_URL

## Task Commits

Each task was committed atomically:

1. **Task 1: Legal pages, help/FAQ, donation, invite-friends, settings update** - `4741137` (feat)
2. **Task 2: App store metadata and launch pages tests** - `9732453` (feat)

## Files Created/Modified
- `apps/web/app/(public)/terms/page.tsx` - Terms of service (server component, SEO metadata)
- `apps/web/app/(public)/privacy/page.tsx` - Privacy policy (server component, GDPR sections)
- `apps/web/app/(public)/help/page.tsx` - Help/FAQ with 5 categories, 15 questions
- `apps/web/app/(app)/donate/page.tsx` - Donation page with Ko-fi external link
- `apps/web/components/invite-friends.tsx` - InviteFriends component (button/link variants)
- `apps/web/app/(app)/settings/page.tsx` - Updated legal link, added invite friends and support us
- `apps/web/public/store-metadata.json` - iOS and Android app store metadata
- `apps/web/__tests__/launch-pages.test.ts` - 14 unit tests

## Decisions Made
- Legal pages are server components (no "use client") for SEO crawlability and zero JS overhead
- Help/FAQ uses native HTML details/summary elements for zero-JS accordion (no library needed)
- Settings page "Legal" item routes to /terms as the primary legal page (privacy linked from within)
- InviteFriends inline in settings via handleInviteFriends (avoids importing full component for one button)

## Deviations from Plan

None. All tasks executed as specified.

## Issues Encountered
None

## User Setup Required

**Placeholder URLs and emails need updating before production:**
- `support@rideshare.festapp.com` - Support email on ToS, privacy, and help pages
- `privacy@rideshare.festapp.com` - Data protection email on privacy page
- `https://ko-fi.com/festapp` - Donation link on /donate page
- Store metadata screenshot filenames are placeholders (actual screenshots needed for submission)

## Next Phase Readiness
- PLAT-03 satisfied: Terms of service and privacy policy pages exist
- PLAT-04 satisfied: Donation prompt page with external link
- PLAT-08 satisfied: Help/FAQ page with common questions
- PLAT-09 satisfied: Invite friends component with share functionality
- PLAT-16 satisfied: App store descriptions and metadata for iOS and Android
- 14 unit tests pass
- All launch preparation pages complete

---
*Phase: 11-polish-testing-launch*
*Completed: 2026-02-16*
