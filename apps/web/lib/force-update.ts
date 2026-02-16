/**
 * Force-update mechanism (PLAT-14).
 * Checks version.json for minimum required version and prompts user to refresh.
 */

export const APP_VERSION = "1.0.0";
export const FORCE_UPDATE_KEY = "festapp-force-update-dismissed";

type VersionInfo = {
  minVersion: string;
  latestVersion: string;
  updateUrl: string;
};

/**
 * Simple semver comparison. Returns:
 *  -1 if a < b
 *   0 if a === b
 *   1 if a > b
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

/**
 * Check for available updates by fetching version.json.
 */
export async function checkForUpdate(): Promise<{
  updateAvailable: boolean;
  minVersion: string;
} | null> {
  try {
    const res = await fetch("/version.json", { cache: "no-store" });
    if (!res.ok) return null;

    const info: VersionInfo = await res.json();
    const updateAvailable = compareSemver(APP_VERSION, info.minVersion) < 0;

    return { updateAvailable, minVersion: info.minVersion };
  } catch {
    return null;
  }
}

/**
 * Whether the update banner should be shown.
 */
export function shouldShowUpdateBanner(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(FORCE_UPDATE_KEY) !== "dismissed";
}

/**
 * Dismiss the update banner for this session.
 */
export function dismissUpdateBanner(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FORCE_UPDATE_KEY, "dismissed");
}
