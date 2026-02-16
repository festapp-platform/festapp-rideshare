import * as Sentry from "@sentry/browser";

let initialized = false;

/**
 * Initialize Sentry error monitoring.
 * No-ops gracefully when NEXT_PUBLIC_SENTRY_DSN is not set.
 */
export function initSentry(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn("[Sentry] NEXT_PUBLIC_SENTRY_DSN not set — error reporting disabled.");
    return;
  }

  if (initialized) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });

  initialized = true;
}

/**
 * Capture an error to Sentry with optional extra context.
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>,
): void {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Associate errors with a user ID (anonymized).
 */
export function setUser(userId: string | null): void {
  if (!initialized) return;

  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}
