"use client";

/**
 * Skip-to-content link for keyboard navigation (PLAT-15).
 * Visually hidden by default, becomes visible on focus.
 * Allows keyboard users to bypass navigation and jump to main content.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none"
    >
      Skip to main content
    </a>
  );
}
