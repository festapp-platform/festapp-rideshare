"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { decode } from "@googlemaps/polyline-codec";

interface RideMapMapyProps {
  /** Encoded polyline string (Google format — both providers use it) */
  encodedPolyline: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

const MAPY_API_KEY = process.env.NEXT_PUBLIC_MAPY_CZ_API_KEY ?? "";
const TILE_URL = `https://api.mapy.cz/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${MAPY_API_KEY}`;

/**
 * Route map using Leaflet with Mapy.cz tiles.
 * Decodes encoded polyline and draws route with origin/destination markers.
 * Drop-in replacement for the Google Maps RideMap component.
 */
export function RideMapMapy({
  encodedPolyline,
  originLat,
  originLng,
  destLat,
  destLng,
}: RideMapMapyProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not already created
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer(TILE_URL, {
        minZoom: 2,
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.seznam.cz" target="_blank">Seznam.cz, a.s.</a>',
      }).addTo(map);

      mapRef.current = map;
    }

    const map = mapRef.current;

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    // Decode polyline
    if (encodedPolyline) {
      const decodedPath = decode(encodedPolyline);
      const latLngs: L.LatLngExpression[] = decodedPath.map(
        ([lat, lng]) => [lat, lng] as [number, number],
      );

      // Draw route polyline
      const polyline = L.polyline(latLngs, {
        color: "#6C63FF",
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      // Fit bounds to polyline
      map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    } else {
      // No polyline — just fit to origin/destination
      const bounds = L.latLngBounds(
        [originLat, originLng],
        [destLat, destLng],
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    // Origin marker (green)
    L.circleMarker([originLat, originLng], {
      radius: 7,
      fillColor: "#22c55e",
      color: "#ffffff",
      weight: 2,
      fillOpacity: 1,
    }).addTo(map);

    // Destination marker (red)
    L.circleMarker([destLat, destLng], {
      radius: 7,
      fillColor: "#ef4444",
      color: "#ffffff",
      weight: 2,
      fillOpacity: 1,
    }).addTo(map);

    return () => {
      // Don't destroy map on re-render, just clear layers next time
    };
  }, [encodedPolyline, originLat, originLng, destLat, destLng]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-border-pastel shadow-sm">
      <div ref={mapContainerRef} style={{ width: "100%", height: "300px" }} />
    </div>
  );
}
