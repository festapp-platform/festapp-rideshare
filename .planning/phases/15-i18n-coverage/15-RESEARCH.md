# Phase 15: i18n Coverage - Research

**Researched:** 2026-02-17
**Domain:** Internationalization / translation coverage for React web app
**Confidence:** HIGH

## Summary

Phase 15 completes the i18n story for the app. The foundational infrastructure (I18nProvider, translations.ts, language settings page) already exists from Phase 11. However, the `t()` function currently performs simple key lookups WITHOUT variable interpolation, and the vast majority of user-facing components still use hardcoded English strings.

The work breaks into four clear categories: (1) add string interpolation to the `t()` function, (2) translate all core flow components (~15 files), (3) translate all secondary and minor components (~10 files), and (4) wire the cookie consent banner and polish the language settings page to use i18n.

**Primary recommendation:** Add interpolation support to the existing `t()` function with a simple regex replacement, then systematically convert each component file by extracting hardcoded strings to translation keys and adding cs/sk/en translations to the flat translations.ts file. The language settings page already exists and is functional -- it just needs hardcoded strings translated.

## User Constraints (from phase context)

### Locked Decisions
- Slovak translations: Machine translate from Czech, flag for native speaker review later
- i18n uses lightweight React context with t() function (Phase 11)
- Flat dot-notation translation keys (nav.search, settings.language)
- localStorage persistence with DEFAULT_LOCALE=cs fallback

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| I18N-01 | t() function supports string interpolation for variables | Current t() does simple lookup only; translations already contain `{length}`, `{names}`, `{price}`, `{currency}` placeholders that are NOT being interpolated. Need to add regex-based variable replacement to the `t()` callback in provider.tsx |
| I18N-02 | All core flow files translated (~131 strings) | 8+ core components identified with hardcoded English: ride-detail, my-rides, booking-button, rating-modal, cancellation-dialog, public ride page, report-dialog, settings page. All need useI18n() + t() wiring and new translation keys |
| I18N-03 | All secondary UI files translated (~26 strings) | 7 secondary components identified: block-button, ride-card, login, signup, cookie-consent, force-update-banner, pwa-install-banner. Login/signup already use t() for most strings but may have gaps |
| I18N-04 | All minor files translated (~9 strings) | 5 minor components identified: offline-banner, share-button, pending-rating-banner, not-found, reset-password. Small files with few strings each |
| I18N-05 | Cookie consent banner uses i18n | Cookie consent at apps/web/components/cookie-consent.tsx has 3 hardcoded English strings ("We use cookies...", "Decline", "Accept") that need translation keys |
| I18N-06 | Language settings page | Page exists at apps/web/app/(app)/settings/language/page.tsx and is FUNCTIONAL (reads locale, writes to localStorage via setLocale). Has 3 hardcoded strings ("Back", "Language", toast message) that need i18n |

## Standard Stack

### Core (already in place)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Context | built-in | I18nProvider wrapping app | Lightweight, no external dependency, already implemented |
| localStorage | built-in | Locale persistence | Already implemented with LOCALE_STORAGE_KEY |

### Supporting (already in place)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @festapp/shared | workspace | SupportedLocale type, DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALE_NAMES constants | All i18n type checking and constants |

### No New Dependencies Required
This phase requires ZERO new npm packages. Everything is built on the existing custom i18n infrastructure from Phase 11.

## Architecture Patterns

### Existing i18n File Structure
```
apps/web/lib/i18n/
  provider.tsx          # I18nProvider with React Context, useI18n hook
  use-translations.ts   # Re-export alias: useTranslations = useI18n
  translations.ts       # TranslationKeys type + cs/sk/en dictionaries

packages/shared/src/constants/
  i18n.ts               # SupportedLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALE_NAMES
```

### Pattern 1: String Interpolation for t()
**What:** Extend `t()` to replace `{variable}` placeholders with provided values
**Current implementation** (provider.tsx line 39-44):
```typescript
const t = useCallback(
  (key: string): string => {
    const dict = translations[locale];
    return (dict as Record<string, string>)[key] ?? key;
  },
  [locale],
);
```

**Required implementation:**
```typescript
const t = useCallback(
  (key: string, vars?: Record<string, string | number>): string => {
    const dict = translations[locale];
    let value = (dict as Record<string, string>)[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  },
  [locale],
);
```

**Also update the type:**
```typescript
type I18nContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};
```

### Pattern 2: Component Translation Wiring
**What:** Standard pattern for converting a component from hardcoded to i18n
**Steps per component:**
1. Import `useI18n` (or `useTranslations`) from provider
2. Call `const { t } = useI18n()` at top of component
3. Replace each hardcoded string with `t('namespace.key')`
4. Add corresponding keys to `TranslationKeys` type
5. Add cs, sk, en values to all three dictionaries
6. For strings with variables, use `t('key', { var: value })`

**Example:**
```typescript
// Before:
<h2>Trip Details</h2>

// After:
<h2>{t('rideDetail.tripDetails')}</h2>
```

### Pattern 3: Server Components Cannot Use useI18n
**What:** Server components (like ride/[id]/page.tsx, ride/[shortId]/page.tsx) cannot use React hooks.
**Impact:** The public ride page and ride detail page.tsx are server components. Only their client sub-components (RideDetail, etc.) can use `useI18n()`. OG metadata strings in generateMetadata remain in English (intentional for SEO).
**Approach:** The server pages pass data to client components that handle translation. No i18n needed in server-only code (metadata, data fetching).

### Pattern 4: Translation Key Namespacing
**What:** Flat dot-notation keys grouped by feature/component
**Existing namespaces:** brand, nav, auth, settings, rides, booking, chat, profile, common, empty, location, errors, rideForm, search, onboarding
**New namespaces needed:** rideDetail, myRides, bookingButton, rating, cancellation, report, rideCard, cookieConsent, forceUpdate, pwaInstall, offlineBanner, shareButton, pendingRating, notFound

### Anti-Patterns to Avoid
- **Translating dynamic data:** Don't translate user-generated content (names, addresses, notes). Only translate UI chrome.
- **Interpolation via concatenation:** Don't do `t('prefix') + name + t('suffix')`. Use interpolation: `t('key', { name })`.
- **Pluralization via ternary in translation:** English plural logic (`seats === 1 ? "seat" : "seats"`) should remain in component code or use simple conditional keys. The app already does this inline, which is fine for 3 locales.
- **Translating in server components:** Don't try to call `useI18n()` in server components. Metadata/SEO strings stay English.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Variable interpolation | Complex template engine | Simple regex `{var}` replacement | App only needs basic variable substitution, not full ICU |
| Pluralization engine | ICU MessageFormat library | Inline ternary per locale | Only 3 locales with similar plural rules (cs/sk share Slavic forms). The current pattern of `count === 1 ? "seat" : "seats"` works. Full plural engine is overkill. |
| Translation file splitting | Per-locale JSON files with lazy loading | Single translations.ts with all 3 locales | ~170 keys x 3 locales fits easily in a single file. The TypeScript type checking ensures no missing keys. |

**Key insight:** The existing architecture is right-sized for this app. Don't upgrade to react-intl, i18next, or similar libraries -- they add bundle weight and complexity without benefit for 3 locales with <250 keys each.

## Common Pitfalls

### Pitfall 1: Missing Translation Keys in TypeScript Type
**What goes wrong:** Adding a key to the cs dictionary but forgetting to add it to `TranslationKeys` type (or vice versa) -- TypeScript catches this at compile time, but only if all 3 dictionaries and the type are updated together.
**Why it happens:** Translations.ts has 4 synchronized structures (type + 3 dicts). Easy to miss one.
**How to avoid:** Always update all 4 locations per key. The TypeScript compiler will error on mismatches since each dict is typed as `TranslationKeys`.
**Warning signs:** TypeScript errors about missing properties in cs/sk/en objects.

### Pitfall 2: Forgetting to Wire useI18n in Client Components
**What goes wrong:** Component imports `useI18n` but forgets the actual hook call, or calls it outside a React function component.
**Why it happens:** Mechanical error during bulk conversion.
**How to avoid:** Pattern is always: `const { t } = useI18n();` as first line after hook calls.

### Pitfall 3: Breaking Existing Interpolation Callers
**What goes wrong:** After adding interpolation to `t()`, existing callers that pass `{placeholder}` strings without the vars argument will show literal `{placeholder}` text.
**Why it happens:** The current code ALREADY has `{length}`, `{names}`, `{price}`, `{currency}` in translation strings but the t() function ignores them.
**How to avoid:** After updating t(), audit all existing callers that use keys containing `{...}` placeholders and ensure they pass the vars argument. Key files: login (auth.otpSent), ride-form (rideForm.recommended), location-sharing-banner (location.sharingWith).
**Warning signs:** Literal `{length}` or `{names}` visible in the UI.

### Pitfall 4: Cookie Consent Not Showing Translated Text on First Load
**What goes wrong:** Cookie consent renders before I18nProvider reads locale from localStorage (SSR/hydration flash).
**Why it happens:** Provider initializes with DEFAULT_LOCALE=cs, then updates to stored locale in useEffect. Cookie consent may render during that gap.
**How to avoid:** This is the existing behavior for all components. The cookie consent banner only appears after useEffect checks localStorage, so the timing naturally aligns.

### Pitfall 5: Language Settings Toast Not Translated
**What goes wrong:** The toast message `"Language changed"` in language settings page is hardcoded English.
**How to avoid:** Replace with `t('settings.languageChanged')` and add the translation key.

### Pitfall 6: Not-Found Page is a Server Component
**What goes wrong:** `app/not-found.tsx` is a server component -- cannot use `useI18n()` hook.
**How to avoid:** Either convert to client component with `"use client"` directive, or extract the content into a client component that uses `useI18n()` and render it from the server page. The simplest approach is adding `"use client"` since the not-found page has no server-side data needs.

## Code Examples

### Interpolation Implementation
```typescript
// In provider.tsx - update t() callback
const t = useCallback(
  (key: string, vars?: Record<string, string | number>): string => {
    const dict = translations[locale];
    let value = (dict as Record<string, string>)[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  },
  [locale],
);
```

### Cookie Consent Translation
```typescript
// New keys needed:
"cookieConsent.message": string;
"cookieConsent.decline": string;
"cookieConsent.accept": string;

// In component:
const { t } = useI18n();
<p>{t('cookieConsent.message')}</p>
<button onClick={handleDecline}>{t('cookieConsent.decline')}</button>
<button onClick={handleAccept}>{t('cookieConsent.accept')}</button>
```

### Existing Interpolation Fix Example
```typescript
// location-sharing-banner.tsx currently likely does:
t('location.sharingWith')  // returns "Sharing location with {names}"

// After fix, should be:
t('location.sharingWith', { names: passengerNames })  // returns "Sharing location with Jan, Petr"
```

## Existing i18n Coverage Audit

### Files ALREADY using useI18n/useTranslations (15 files):
1. `ride-form.tsx` -- extensively translated
2. `signup/page.tsx` -- translated
3. `location-sharing-banner.tsx` -- translated
4. `date-time-picker.tsx` -- translated
5. `map-location-picker.tsx` -- translated
6. `login/page.tsx` -- translated
7. `onboarding/page.tsx` -- translated
8. `reset-password/page.tsx` -- translated
9. `(auth)/layout.tsx` -- translated
10. `settings/page.tsx` -- translated
11. `search/page.tsx` -- translated
12. `app-nav.tsx` -- translated
13. `search-form.tsx` -- translated
14. `email-confirmation-banner.tsx` -- translated
15. `settings/language/page.tsx` -- partially (has hardcoded "Back", "Language")

### Files NEEDING i18n (grouped by requirement):

**I18N-02 Core flow files:**
1. `ride-detail.tsx` -- ~40 strings (Trip Details, Distance, Duration, Price, Driver, Vehicle, Preferences labels, Booking, seats available, Manage Bookings, Live Location, Share My Location, Stop Sharing, Complete Ride, Edit Ride, Cancel Ride, Cancel Booking, Rate this ride, toast messages, etc.)
2. `my-rides/page.tsx` -- ~25 strings (My Rides, As Driver, As Passenger, Upcoming, Past, No upcoming rides, Post a ride, seats, Cancel Booking, Search for a Ride, etc.)
3. `booking-button.tsx` -- ~12 strings (Request pending, Booked, Fully booked, Seats, Book/Request N seat(s), Processing, error toasts)
4. `rating-modal.tsx` -- ~10 strings (Rate your ride with {name}, How was your experience, Comment optional, Share your experience, Submit Rating, Submitting, error toasts)
5. `cancellation-dialog.tsx` -- ~8 strings (Cancel Booking/Ride, warning message, Reason optional, placeholder, Keep, Confirm Cancellation, Cancelling, toast messages)
6. `(public)/ride/[shortId]/page.tsx` -- ~10 strings (per seat, seats left, booking, Departure at, Notes, Book this ride, New driver, review/reviews) -- NOTE: server component, needs client wrapper for translated parts
7. `report-dialog.tsx` -- ~8 strings (Report {name}, description prompt, placeholder, minimum chars, Cancel, Submit Report, Submitting, toast messages)
8. `settings/page.tsx` -- may have remaining hardcoded strings (audit needed)
9. `settings/language/page.tsx` -- 3 strings (Back, Language heading, toast)
10. `rides/[id]/page.tsx` -- server component metadata only, mostly English for SEO

**I18N-03 Secondary UI files:**
1. `block-button.tsx` -- ~6 strings (Block, Unblock, Block {name}?, confirmation message, toast messages)
2. `ride-card.tsx` -- ~4 strings (seats left, km from your pickup, Instant, Request)
3. `cookie-consent.tsx` -- 3 strings (message, Decline, Accept)
4. `force-update-banner.tsx` -- 3 strings (update message, Dismiss, Refresh)
5. `pwa-install-banner.tsx` -- 2 strings (Install Rideshare on your phone, Install)

**I18N-04 Minor files:**
1. `offline-banner.tsx` -- 1 string (You're offline. Some features may not work.)
2. `share-button.tsx` -- 2 strings (Copied!, Share)
3. `pending-rating-banner.tsx` -- 2 strings (You have N rides to rate, Rate now)
4. `not-found.tsx` -- 3 strings (404, page doesn't exist, Go to home)
5. `reset-password/page.tsx` -- already using i18n (verify completeness)

### Translation Key Count Estimate
- Existing keys in translations.ts: ~175 keys per locale
- New keys needed: ~120-140
- Total after phase: ~295-315 keys per locale

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded English strings | Incrementally adding t() calls per phase | Phase 11 (Feb 2026) | Phase 15 completes the coverage |
| No interpolation in t() | Add simple {var} regex replacement | Phase 15 | Enables dynamic content in translations |

## Open Questions

1. **Public ride page (server component) translation**
   - What we know: `(public)/ride/[shortId]/page.tsx` is a server component with ~10 hardcoded strings
   - What's unclear: Should we convert to client component or extract a client sub-component?
   - Recommendation: Extract a `PublicRideContent` client component for the translated UI, keep the server page for metadata/SEO. This matches how rides/[id]/page.tsx already delegates to `RideDetail`.

2. **Date formatting locale**
   - What we know: Dates are formatted with `date-fns` format() using English patterns ("EEE, MMM d, yyyy")
   - What's unclear: Should date formatting be localized (e.g., Czech date format)?
   - Recommendation: Defer date localization. It requires date-fns locale imports and is a separate concern. The app's dates are self-explanatory. Can be added in a follow-up.

3. **Ride status badge strings**
   - What we know: `ride-status-badge.tsx` likely has status labels ("Upcoming", "In Progress", "Completed", "Cancelled")
   - What's unclear: Whether these are already counted in the core flow estimate
   - Recommendation: Include in core flow translation pass, verify during implementation.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files listed
- `apps/web/lib/i18n/provider.tsx` -- current t() implementation confirmed: no interpolation support
- `apps/web/lib/i18n/translations.ts` -- full key audit: 175 keys, 3 locales, interpolation placeholders present but unused
- `packages/shared/src/constants/i18n.ts` -- locale types and constants confirmed

### Secondary (MEDIUM confidence)
- String count estimates (~131/~26/~9) are approximate based on visual inspection of component files. Actual counts may vary by 10-20% during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, existing infrastructure is well-understood
- Architecture: HIGH -- pattern is established in 15 files already, just needs replication
- Pitfalls: HIGH -- identified from direct code inspection, especially the interpolation gap
- String counts: MEDIUM -- estimates based on file inspection, may vary during implementation

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable -- i18n infrastructure is custom and unlikely to change externally)
