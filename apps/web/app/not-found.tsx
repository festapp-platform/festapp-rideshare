import Link from "next/link";
import { MapPinOff } from "lucide-react";

/**
 * Custom 404 page (PLAT-07).
 *
 * Next.js special not-found page with friendly message and navigation back to home.
 */

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto mt-[-4rem] max-w-md rounded-2xl border border-border-pastel bg-surface p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center text-text-secondary">
          <MapPinOff size={64} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-text-main">404</h1>
        <p className="mt-3 text-text-secondary">
          This page doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light"
        >
          Go to home
        </Link>
      </div>
    </div>
  );
}
