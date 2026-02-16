import Link from "next/link";

/**
 * Public layout: no auth required, clean page for SEO crawlers
 * and unauthenticated visitors viewing shared links.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal header */}
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Link href="/search" className="flex items-center gap-2 font-semibold text-gray-900">
            <span className="text-lg">Festapp Rideshare</span>
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* CTA banner */}
      <footer className="border-t bg-gray-50 px-4 py-6 text-center">
        <p className="mb-3 text-sm text-gray-600">
          Share rides, save money, meet people
        </p>
        <Link
          href="/signup"
          className="inline-block rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Join Festapp Rideshare
        </Link>
      </footer>
    </div>
  );
}
