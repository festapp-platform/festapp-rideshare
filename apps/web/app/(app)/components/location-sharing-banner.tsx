"use client";

import { useLocationSharing } from "../contexts/location-sharing-context";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Persistent amber banner shown on ALL authenticated pages when
 * the driver is sharing their live location (LEGAL-03).
 *
 * Displays who can see the location and provides a one-tap stop button.
 * Lives in the app layout so it persists across route navigation.
 */
export function LocationSharingBanner() {
  const { isSharing, passengerNames, stopSharing } = useLocationSharing();
  const { t } = useI18n();

  if (!isSharing) return null;

  const names =
    passengerNames.length > 0
      ? passengerNames.join(", ")
      : t("location.passengers");

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-md"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>
        <span>{t("location.sharingWith").replace("{names}", names)}</span>
      </div>
      <button
        onClick={stopSharing}
        className="shrink-0 rounded-lg bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        {t("location.stop")}
      </button>
    </div>
  );
}
