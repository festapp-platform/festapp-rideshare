import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ANALYTICS_CONSENT_KEY,
  hasAnalyticsConsent,
  setAnalyticsConsent,
  trackPageView,
  trackEvent,
} from "@/lib/analytics";
import {
  APP_VERSION,
  FORCE_UPDATE_KEY,
  shouldShowUpdateBanner,
  dismissUpdateBanner,
} from "@/lib/force-update";
import { captureError } from "@/lib/sentry";

describe("Analytics consent", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("hasAnalyticsConsent returns false by default", () => {
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("setAnalyticsConsent(true) makes hasAnalyticsConsent return true", () => {
    setAnalyticsConsent(true);
    expect(hasAnalyticsConsent()).toBe(true);
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("true");
  });

  it("setAnalyticsConsent(false) makes hasAnalyticsConsent return false", () => {
    setAnalyticsConsent(false);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("false");
  });

  it("ANALYTICS_CONSENT_KEY is festapp-analytics-consent", () => {
    expect(ANALYTICS_CONSENT_KEY).toBe("festapp-analytics-consent");
  });
});

describe("Analytics tracking", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("trackPageView does not fire when consent is false", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    trackPageView("/home");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("trackPageView fires when consent is true", () => {
    setAnalyticsConsent(true);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    trackPageView("/home");
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith("/api/analytics", expect.objectContaining({
      method: "POST",
    }));
  });

  it("trackEvent does not fire when consent is false", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    trackEvent("click_button", { button: "cta" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("trackEvent fires when consent is true", () => {
    setAnalyticsConsent(true);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    trackEvent("click_button", { button: "cta" });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});

describe("Force update", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("APP_VERSION is a valid semver string", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("shouldShowUpdateBanner returns true by default (not dismissed)", () => {
    expect(shouldShowUpdateBanner()).toBe(true);
  });

  it("shouldShowUpdateBanner returns false after dismissUpdateBanner", () => {
    dismissUpdateBanner();
    expect(shouldShowUpdateBanner()).toBe(false);
    expect(sessionStorage.getItem(FORCE_UPDATE_KEY)).toBe("dismissed");
  });
});

describe("Sentry", () => {
  it("captureError does not throw when Sentry is not initialized", () => {
    expect(() => captureError(new Error("test error"))).not.toThrow();
  });

  it("captureError does not throw with context", () => {
    expect(() =>
      captureError(new Error("test"), { page: "/home" }),
    ).not.toThrow();
  });
});
