"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Custom error page (PLAT-07).
 *
 * Next.js error boundary page with retry and navigation.
 * Receives error and reset props from Next.js error handling.
 */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto mt-[-4rem] max-w-md rounded-2xl border border-border-pastel bg-surface p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center text-error">
          <AlertTriangle size={64} strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold text-text-main">Something went wrong</h1>
        <p className="mt-3 text-sm text-text-secondary">
          An unexpected error occurred. Please try again.
        </p>
        {error.message && (
          <p className="mt-3 rounded-lg bg-background px-3 py-2 text-xs text-text-secondary">
            {error.message}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light"
          >
            Try again
          </button>
          <Link
            href="/search"
            className="rounded-xl border border-border-pastel px-6 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-background"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
