"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/register-sw";

/**
 * Headless component that registers the service worker on mount.
 * Renders nothing -- just handles SW registration.
 */
export function PwaInstallPrompt() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
