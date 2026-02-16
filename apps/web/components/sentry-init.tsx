"use client";

import { useEffect } from "react";
import { initSentry } from "@/lib/sentry";

/**
 * Client component that initializes Sentry on mount.
 * Placed in root layout for app-wide error capture.
 */
export function SentryInit() {
  useEffect(() => {
    initSentry();
  }, []);

  return null;
}
