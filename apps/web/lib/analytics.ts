/**
 * Lightweight anonymous analytics — no third-party SDK.
 * All tracking is gated behind cookie consent.
 * No PII is collected, only page paths and event names.
 */

export const ANALYTICS_CONSENT_KEY = "festapp-analytics-consent";

/**
 * Check if the user has given analytics consent.
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ANALYTICS_CONSENT_KEY) === "true";
}

/**
 * Set the analytics consent preference.
 */
export function setAnalyticsConsent(value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANALYTICS_CONSENT_KEY, value ? "true" : "false");
}

/**
 * Track an anonymous page view. Only fires if consent is given.
 */
export function trackPageView(path: string): void {
  if (!hasAnalyticsConsent()) return;

  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "pageview", path, timestamp: Date.now() }),
  }).catch(() => {
    // Silently ignore analytics failures
  });
}

/**
 * Track an anonymous event. Only fires if consent is given.
 */
export function trackEvent(
  name: string,
  data?: Record<string, unknown>,
): void {
  if (!hasAnalyticsConsent()) return;

  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "event", name, data, timestamp: Date.now() }),
  }).catch(() => {
    // Silently ignore analytics failures
  });
}
