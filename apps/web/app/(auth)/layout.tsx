"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Auth layout: centered card for login/signup/reset-password pages.
 * Redirects authenticated users to /search.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      // Allow authenticated users to access reset-password (to change their password)
      const isResetPassword = window.location.pathname === "/reset-password";
      if (user && !isResetPassword) {
        router.replace("/search");
      } else {
        setIsChecking(false);
      }
    });
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-text-secondary">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-main">
            spolujizda.online
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {t("brand.subtitle")}
          </p>
        </div>
        <div className="rounded-xl bg-surface p-8 shadow-sm border border-border">
          {children}
        </div>
      </div>
    </div>
  );
}
