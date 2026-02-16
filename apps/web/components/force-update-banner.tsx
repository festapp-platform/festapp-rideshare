"use client";

import { useState, useEffect } from "react";
import {
  checkForUpdate,
  shouldShowUpdateBanner,
  dismissUpdateBanner,
} from "@/lib/force-update";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Force-update prompt banner (PLAT-14).
 * Shows when version.json indicates a newer minimum version is required.
 * Dismissal is session-scoped (shows again next session).
 */
export function ForceUpdateBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldShowUpdateBanner()) return;

    checkForUpdate().then((result) => {
      if (result?.updateAvailable) {
        setVisible(true);
      }
    });
  }, []);

  if (!visible) return null;

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    dismissUpdateBanner();
    setVisible(false);
  };

  return (
    <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <span>{t("forceUpdate.message")}</span>
      <div className="ml-4 flex shrink-0 gap-2">
        <button
          onClick={handleDismiss}
          className="rounded-lg px-3 py-1 text-amber-600 transition-colors hover:bg-amber-100"
        >
          {t("forceUpdate.dismiss")}
        </button>
        <button
          onClick={handleRefresh}
          className="rounded-lg bg-amber-600 px-3 py-1 font-medium text-white transition-colors hover:bg-amber-700"
        >
          {t("forceUpdate.refresh")}
        </button>
      </div>
    </div>
  );
}
