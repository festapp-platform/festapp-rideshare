"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Offline connectivity banner (PLAT-05).
 *
 * Monitors navigator.onLine and online/offline events.
 * Shows a fixed warning banner at the top when offline, auto-hides when back online.
 */

export function OfflineBanner() {
  const { t } = useI18n();
  const [isOffline, setIsOffline] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline || isDismissed) {
    return null;
  }

  return (
    <div
      data-testid="offline-banner"
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-warning px-4 py-2 text-sm font-medium text-text-main"
    >
      <span>{t("offlineBanner.message")}</span>
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="ml-4 shrink-0 rounded p-1 transition-colors hover:bg-black/10"
        aria-label="Dismiss offline banner"
      >
        &#x2715;
      </button>
    </div>
  );
}
