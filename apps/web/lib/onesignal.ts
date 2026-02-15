/**
 * OneSignal web push notification initialization and user linking.
 *
 * Client-side only -- guards against SSR with typeof window check.
 * Links device to Supabase user via external_id (OneSignal.login).
 *
 * Required env: NEXT_PUBLIC_ONESIGNAL_APP_ID
 */
import OneSignal from "react-onesignal";

let initialized = false;

/**
 * Initialize OneSignal SDK. Safe to call multiple times (idempotent).
 * No-ops on server or when app ID is not configured.
 */
export async function initOneSignal(): Promise<void> {
  if (initialized || typeof window === "undefined") return;

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn("OneSignal app ID not configured (NEXT_PUBLIC_ONESIGNAL_APP_ID)");
    return;
  }

  await OneSignal.init({
    appId,
    allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
  });
  initialized = true;
}

/**
 * Link current device to a Supabase user via OneSignal external_id.
 * Call on auth state change (login).
 */
export async function loginOneSignal(userId: string): Promise<void> {
  if (!initialized) await initOneSignal();
  if (!initialized) return; // Still not initialized (no app ID)
  OneSignal.login(userId);
}

/**
 * Unlink device from user. Call on logout.
 */
export function logoutOneSignal(): void {
  if (!initialized) return;
  OneSignal.logout();
}
