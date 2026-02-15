"use client";

import { APIProvider } from "@vis.gl/react-google-maps";

/**
 * Map provider selection based on NEXT_PUBLIC_MAP_PROVIDER env var.
 *
 * Values:
 *   "mapy"   — Mapy.cz tiles + suggest + routing (default if NEXT_PUBLIC_MAPY_CZ_API_KEY is set)
 *   "google"  — Google Maps + Places + Routes API
 *
 * When provider is "mapy", the GoogleMapsProvider wrapper is skipped entirely
 * (Leaflet doesn't need a provider wrapper). Components use the Mapy variants.
 */

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAPY_API_KEY = process.env.NEXT_PUBLIC_MAPY_CZ_API_KEY ?? "";

export type MapProviderType = "google" | "mapy";

export function getMapProvider(): MapProviderType {
  const explicit = process.env.NEXT_PUBLIC_MAP_PROVIDER;
  if (explicit === "google" || explicit === "mapy") return explicit;
  // Auto-detect: prefer Mapy.cz if key is set
  if (MAPY_API_KEY) return "mapy";
  return "google";
}

/**
 * Universal map provider wrapper.
 * For Google: wraps children in APIProvider.
 * For Mapy.cz: passes children through (Leaflet needs no provider).
 */
export function MapProvider({ children }: { children: React.ReactNode }) {
  const provider = getMapProvider();

  if (provider === "google" && GOOGLE_API_KEY) {
    return (
      <APIProvider apiKey={GOOGLE_API_KEY} libraries={["places"]}>
        {children}
      </APIProvider>
    );
  }

  // Mapy.cz or no Google key — just render children
  return <>{children}</>;
}
