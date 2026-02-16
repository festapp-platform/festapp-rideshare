"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Banner shown to users who signed up via email but haven't confirmed yet.
 * Checks the user's email_confirmed_at field.
 * Renders at the top of the app content area.
 */
export function EmailConfirmationBanner() {
  const { t } = useI18n();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.email && !user.email_confirmed_at) {
        setShowBanner(true);
      }
    });

    // Listen for auth state changes (e.g., user confirms email in another tab)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) {
        setShowBanner(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!showBanner) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-900/20">
      <div className="mx-auto flex max-w-4xl items-start gap-3">
        <svg
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {t("auth.pendingConfirmation")}
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
            {t("auth.pendingConfirmationMessage")}
          </p>
        </div>
      </div>
    </div>
  );
}
