"use client";

import { getMapProvider } from "@/lib/map-provider";
import { RideMap as GoogleRideMap } from "./ride-map";
import { RideMapMapy } from "./ride-map-mapy";

interface RouteMapProps {
  encodedPolyline: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

/**
 * Provider-agnostic route map.
 * Uses Google Maps or Leaflet+Mapy.cz tiles based on NEXT_PUBLIC_MAP_PROVIDER.
 */
export function RouteMap(props: RouteMapProps) {
  const provider = getMapProvider();

  if (provider === "mapy") {
    return <RideMapMapy {...props} />;
  }

  return <GoogleRideMap {...props} />;
}
