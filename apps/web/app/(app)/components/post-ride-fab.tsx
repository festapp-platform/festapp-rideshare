'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Floating Action Button for posting a ride (NAV-07).
 *
 * Visible on all authenticated screens except /rides/new itself.
 * Positioned above mobile bottom nav (bottom-20) and in bottom-right corner.
 * On desktop, sits at standard bottom-right with bottom-8.
 */
export function PostRideFab() {
  const pathname = usePathname();

  // Hide on the ride posting pages to avoid redundancy
  if (pathname.startsWith('/rides/new')) {
    return null;
  }

  return (
    <Link
      href="/rides/new"
      aria-label="Post a ride"
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-105 hover:bg-primary/90 active:scale-95 md:bottom-8 md:right-8"
    >
      <svg
        className="h-7 w-7 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4.5v15m7.5-7.5h-15"
        />
      </svg>
    </Link>
  );
}
