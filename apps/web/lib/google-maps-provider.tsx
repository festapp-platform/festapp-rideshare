"use client";

import { APIProvider } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/**
 * Google Maps API provider that wraps the app layout.
 * Loads the Places library for autocomplete and Maps for route display.
 *
 * Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local to enable.
 * Without a key, Maps/Places components will render but API calls will fail.
 */
export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      {children}
    </APIProvider>
  );
}
