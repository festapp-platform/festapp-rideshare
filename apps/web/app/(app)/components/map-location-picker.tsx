"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "@/lib/i18n/provider";

const MAPY_API_KEY = process.env.NEXT_PUBLIC_MAPY_CZ_API_KEY ?? "";
const TILE_URL = `https://api.mapy.cz/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${MAPY_API_KEY}`;

interface MapLocationPickerProps {
  onConfirm: (lat: number, lng: number, address: string) => void;
  onCancel: () => void;
}

/**
 * Full-screen map picker for selecting a location by clicking/tapping.
 * Uses Leaflet with Mapy.cz tiles.
 * Reverse geocodes the selected point to an address.
 * (GROUP-F1)
 */
export function MapLocationPicker({ onConfirm, onCancel }: MapLocationPickerProps) {
  const { t } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://api.mapy.cz/v1/rgeocode?lon=${lng}&lat=${lat}&apikey=${MAPY_API_KEY}`,
        { headers: { Accept: "application/json" } },
      );
      if (res.ok) {
        const data = await res.json();
        const items = data?.items;
        if (items && items.length > 0) {
          setAddress(items[0].name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          return;
        }
      }
    } catch {
      // Fallback to coordinate display
    }
    setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setIsGeocoding(false);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [49.8, 15.5], // Czech Republic center
      zoom: 7,
      zoomControl: true,
    });

    L.tileLayer(TILE_URL, {
      minZoom: 2,
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.seznam.cz" target="_blank">Seznam.cz, a.s.</a>',
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedPoint({ lat, lng });

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: "#6C63FF",
          color: "#ffffff",
          weight: 3,
          fillOpacity: 1,
        }).addTo(map);
      }

      reverseGeocode(lat, lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [reverseGeocode]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-pastel bg-surface px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-text-secondary hover:text-text-main"
        >
          {t("common.cancel")}
        </button>
        <span className="text-sm font-semibold text-text-main">
          {t("rideForm.selectOnMap")}
        </span>
        <button
          type="button"
          onClick={() => {
            if (selectedPoint) {
              onConfirm(selectedPoint.lat, selectedPoint.lng, address);
            }
          }}
          disabled={!selectedPoint || isGeocoding}
          className="text-sm font-semibold text-primary disabled:opacity-50"
        >
          {t("rideForm.confirmLocation")}
        </button>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1" />

      {/* Selected address bar */}
      {selectedPoint && (
        <div className="border-t border-border-pastel bg-surface px-4 py-3">
          <p className="text-sm text-text-main">
            {isGeocoding ? t("common.loading") : address}
          </p>
        </div>
      )}
    </div>
  );
}
