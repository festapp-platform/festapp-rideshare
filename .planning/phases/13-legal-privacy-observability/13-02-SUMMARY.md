---
phase: 13-legal-privacy-observability
plan: 02
subsystem: auth, ui
tags: [tos, gdpr, legal, i18n, czech, signup, consent, privacy-policy]

requires:
  - phase: 11-polish-i18n
    provides: i18n context with t() function and flat dot-notation keys
  - phase: 01-foundation-auth
    provides: Supabase auth signUp/signInWithOtp/signInWithOAuth flows
provides:
  - ToS consent checkbox gating all web signup methods (email, phone, Google, Apple)
  - ToS consent checkbox gating mobile email signup
  - accepted_terms_at ISO timestamp in user_metadata for email and phone signups
  - Production-quality bilingual Czech/English Terms of Service page
  - Production-quality bilingual Czech/English Privacy Policy page with GDPR references
affects: [13-legal-privacy-observability, admin-panel]

tech-stack:
  added: []
  patterns:
    - "Shared acceptedTerms state gating all signup methods via early return"
    - "Bilingual legal pages (Czech primary, English secondary) in prose article layout"

key-files:
  created: []
  modified:
    - apps/web/app/(auth)/signup/page.tsx
    - apps/mobile/app/(auth)/signup.tsx
    - apps/web/app/(public)/terms/page.tsx
    - apps/web/app/(public)/privacy/page.tsx
    - apps/web/lib/i18n/translations.ts

key-decisions:
  - "Single acceptedTerms state above tab switcher gates all 4 signup methods (not per-form Zod validation)"
  - "Social OAuth consent proven by UI checkbox flow; no post-auth metadata update needed for MVP"
  - "Czech legal text uses proper Civil Code terminology (Obcansky zakonik) with correct diacritics"
  - "Contact email updated to contact@spolujizda.online across both legal pages"

patterns-established:
  - "Legal consent gate: check acceptedTerms state with early return before any auth call"

requirements-completed: [LEGAL-01, LEGAL-02]

duration: 6min
completed: 2026-02-16
---

# Phase 13 Plan 02: ToS Consent & Legal Content Summary

**ToS checkbox gating all signup flows with production-quality bilingual Czech/English legal pages and GDPR-compliant privacy policy**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-16T22:16:39Z
- **Completed:** 2026-02-16T22:22:49Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- ToS checkbox on web signup gates all 4 methods: email, phone, Google OAuth, Apple OAuth
- ToS checkbox on mobile email signup with Zod schema validation
- accepted_terms_at ISO timestamp stored in user_metadata for email and phone signups
- Czech Terms of Service covering eligibility, cost sharing, liability, governing law (12 sections)
- Czech Privacy Policy with GDPR legal basis (Art. 6(1)(a/b/f)), retention periods, user rights (Art. 15-22)
- i18n translations for consent UI in Czech, Slovak, and English

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ToS checkbox to web and mobile signup forms** - `1a78c14` (feat)
2. **Task 2: Generate Czech legal content for Terms and Privacy pages** - `b6e29bd` (feat)

## Files Created/Modified
- `apps/web/app/(auth)/signup/page.tsx` - Added acceptedTerms state, checkbox UI, gated all 4 submit functions, added accepted_terms_at to signUp/signInWithOtp options.data
- `apps/mobile/app/(auth)/signup.tsx` - Added accepted_terms to Zod schema, checkbox Controller, accepted_terms_at in signUp options.data
- `apps/web/app/(public)/terms/page.tsx` - Bilingual ToS: Czech (12 sections) + English (12 sections)
- `apps/web/app/(public)/privacy/page.tsx` - Bilingual Privacy Policy: Czech (9 sections) + English (9 sections)
- `apps/web/lib/i18n/translations.ts` - Added auth.agreeToTermsPre, auth.termsOfService, auth.privacyPolicy, auth.mustAcceptTerms, common.and keys in cs/sk/en

## Decisions Made
- Used a single `acceptedTerms` state variable with checkbox rendered above the tab switcher rather than per-form Zod validation -- simpler and guarantees all signup methods are gated
- Social OAuth consent is proven by the UI checkbox flow; no post-auth `updateUser` call needed for MVP since the checkbox must be checked before the OAuth redirect
- Contact email updated from old festapp domain to contact@spolujizda.online
- Czech legal text follows Civil Code (zakon c. 89/2012 Sb.) conventions with proper terminology

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Next.js build lock file was stale from previous build; cleared `.next/lock` and rebuild succeeded

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- LEGAL-01 and LEGAL-02 requirements fully satisfied
- Legal pages ready for review by domain expert if needed
- ToS consent flow ready for production use

---
*Phase: 13-legal-privacy-observability*
*Completed: 2026-02-16*
