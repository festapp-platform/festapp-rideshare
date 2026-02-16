# 11-04 Summary: Accessibility Audit & Polish

## Status: COMPLETED

## What was done

### Task 1: Accessibility infrastructure
- **SkipLink** (`apps/web/components/skip-link.tsx`): Skip-to-content link, sr-only by default, visible on focus, links to `#main-content`
- **AccessibleButton** (`apps/web/components/accessible-button.tsx`): Wrapper button with 44px min touch targets, focus ring, disabled styling, forwarded ref, sm/md/lg sizes
- **app-nav.tsx**: Added `role="navigation"`, `aria-label="Main navigation"` / `"Mobile navigation"`, `aria-current="page"` on active links, `aria-hidden="true"` on decorative icon spans, `min-h-[44px]` on sidebar links
- **layout.tsx**: Added `<SkipLink />` as first element, `id="main-content"` on `<main>` tag
- **globals.css**: Global `:focus-visible` outline (2px solid primary), `prefers-reduced-motion: reduce` media query, darkened `--text-secondary` from `#8E8BA3` to `#6B6880` for WCAG AA contrast compliance (4.5:1+)

### Task 2: Accessibility unit tests
- 18 tests in `apps/web/__tests__/accessibility.test.tsx`
- SkipLink: text content, href, sr-only class (3 tests)
- AccessibleButton: aria-label, touch targets, focus ring, disabled state, ref forwarding (5 tests)
- Navigation ARIA: role/label, aria-current active/inactive, aria-hidden icons (4 tests)
- Color contrast: light text/bg, light secondary/bg, dark text/bg, dark secondary/bg (4 tests)
- CSS audit: reduced-motion rule, focus-visible rule (2 tests)

## Key decisions
- Darkened `--text-secondary` from `#8E8BA3` to `#6B6880` to meet WCAG AA 4.5:1 contrast on light background
- AccessibleButton is opt-in for new features; existing buttons don't need immediate migration
- Inline JSX test pattern reused to avoid pnpm dual-React issues (consistent with 07-03/09-04/11-02)

## Artifacts
| File | Purpose |
|------|---------|
| `apps/web/components/skip-link.tsx` | Skip-to-content keyboard navigation |
| `apps/web/components/accessible-button.tsx` | Accessible button with touch targets and focus ring |
| `apps/web/app/(app)/app-nav.tsx` | ARIA labels, roles, aria-current on navigation |
| `apps/web/app/(app)/layout.tsx` | SkipLink integration, main-content landmark |
| `apps/web/app/globals.css` | Focus-visible, reduced motion, contrast fix |
| `apps/web/__tests__/accessibility.test.tsx` | 18 accessibility tests |

## Verification
- `npx vitest run __tests__/accessibility.test.tsx` — 18/18 pass
- TypeCheck: no new errors (pre-existing seo.test.ts issue only)
