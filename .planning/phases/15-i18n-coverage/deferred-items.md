# Deferred Items - Phase 15 i18n Coverage

## Pre-existing Build Issue

**vehicles/new page prerender failure**: `useI18n must be used within an I18nProvider` during static prerendering of `/vehicles/new`. This is a pre-existing issue (confirmed by testing on commit before 15-03 changes). The page likely needs `export const dynamic = 'force-dynamic'` or wrapping in I18nProvider boundary during SSR.
