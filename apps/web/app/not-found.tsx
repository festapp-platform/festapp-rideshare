"use client";

import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Custom 404 page (PLAT-07).
 *
 * Next.js special not-found page with friendly message and navigation back to home.
 * Converted to client component for i18n support via useI18n hook.
 */

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto mt-[-4rem] max-w-md rounded-2xl border border-border-pastel bg-surface p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center text-text-secondary">
          <MapPinOff size={64} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-text-main">{t("notFound.title")}</h1>
        <p className="mt-3 text-text-secondary">
          {t("notFound.message")}
        </p>
        <Link
          href="/search"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light"
        >
          {t("notFound.goHome")}
        </Link>
      </div>
    </div>
  );
}
