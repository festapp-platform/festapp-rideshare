"use client";

import { useState, useEffect } from "react";
import { ANALYTICS_CONSENT_KEY, setAnalyticsConsent } from "@/lib/analytics";

/**
 * GDPR cookie consent banner (PLAT-06).
 * Appears on first visit. Hides once user accepts or declines.
 * Preference is persisted in localStorage.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if consent has not been set yet (neither true nor false)
    const stored = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (stored === null) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setAnalyticsConsent(true);
    setVisible(false);
  };

  const handleDecline = () => {
    setAnalyticsConsent(false);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-lg rounded-t-2xl border-t border-border-pastel bg-surface px-6 py-4 shadow-lg">
      <p className="mb-3 text-sm text-text-secondary">
        We use cookies for analytics to improve your experience. No personal
        data is collected.
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleDecline}
          className="flex-1 rounded-xl border border-border-pastel px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-primary/5"
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
