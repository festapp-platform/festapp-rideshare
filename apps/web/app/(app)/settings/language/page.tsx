"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import {
  SUPPORTED_LOCALES,
  LOCALE_NAMES,
  type SupportedLocale,
} from "@festapp/shared";
import { toast } from "sonner";

export default function LanguageSettingsPage() {
  const { locale, setLocale } = useI18n();

  const handleSelect = (newLocale: SupportedLocale) => {
    if (newLocale !== locale) {
      setLocale(newLocale);
      toast.success("Language changed");
    }
  };

  return (
    <div>
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-main"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-text-main">Language</h1>

      <div className="overflow-hidden rounded-xl border border-border-pastel bg-surface">
        {SUPPORTED_LOCALES.map((loc, index) => (
          <button
            key={loc}
            onClick={() => handleSelect(loc)}
            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-primary/5 ${
              index < SUPPORTED_LOCALES.length - 1
                ? "border-b border-border-pastel"
                : ""
            } text-text-main`}
          >
            <span>{LOCALE_NAMES[loc]}</span>
            {locale === loc && (
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
