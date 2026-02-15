"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@vis.gl/react-google-maps";
import type { LocationPayload } from "@festapp/shared";

interface LiveLocationMapProps {
  pickupLat: number;
  pickupLng: number;
  driverPosition: LocationPayload | null;
  isDriver: boolean;
}

/**
 * Google Map showing pickup location and a smoothly-animated driver position marker.
 * Used during active ride sharing for both driver and passenger views.
 */
export function LiveLocationMap({
  pickupLat,
  pickupLng,
  driverPosition,
  isDriver,
}: LiveLocationMapProps) {
  const map = useMap();
  const pickupMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const driverMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const boundsSetRef = useRef(false);

  // Create pickup marker
  useEffect(() => {
    if (!map) return;

    const pickupPin = document.createElement("div");
    pickupPin.style.width = "14px";
    pickupPin.style.height = "14px";
    pickupPin.style.borderRadius = "50%";
    pickupPin.style.backgroundColor = "#22c55e";
    pickupPin.style.border = "2px solid white";
    pickupPin.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: pickupLat, lng: pickupLng },
      content: pickupPin,
      title: "Pickup",
    });
    pickupMarkerRef.current = marker;

    return () => {
      marker.map = null;
      pickupMarkerRef.current = null;
    };
  }, [map, pickupLat, pickupLng]);

  // Create and update driver marker
  useEffect(() => {
    if (!map) return;

    if (!driverPosition) {
      // Remove driver marker if no position
      if (driverMarkerRef.current) {
        driverMarkerRef.current.map = null;
        driverMarkerRef.current = null;
      }
      boundsSetRef.current = false;
      return;
    }

    // Create driver marker if it doesn't exist
    if (!driverMarkerRef.current) {
      // Create pulsing blue dot with CSS animation
      const driverPin = document.createElement("div");
      driverPin.style.width = "18px";
      driverPin.style.height = "18px";
      driverPin.style.borderRadius = "50%";
      driverPin.style.backgroundColor = "#3b82f6";
      driverPin.style.border = "3px solid white";
      driverPin.style.boxShadow = "0 0 0 0 rgba(59, 130, 246, 0.5)";
      driverPin.style.animation = "driver-pulse 2s ease-in-out infinite";

      // Inject keyframe style if not already present
      if (!document.getElementById("driver-pulse-style")) {
        const style = document.createElement("style");
        style.id = "driver-pulse-style";
        style.textContent = `
          @keyframes driver-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
            50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
          }
        `;
        document.head.appendChild(style);
      }

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: driverPosition.lat, lng: driverPosition.lng },
        content: driverPin,
        title: "Driver",
      });
      driverMarkerRef.current = marker;
    } else {
      // Update position -- AdvancedMarkerElement handles smooth repositioning
      driverMarkerRef.current.position = {
        lat: driverPosition.lat,
        lng: driverPosition.lng,
      };
    }

    // Auto-fit bounds to include both markers (only on first position or when significantly changed)
    if (!boundsSetRef.current) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: pickupLat, lng: pickupLng });
      bounds.extend({ lat: driverPosition.lat, lng: driverPosition.lng });
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      boundsSetRef.current = true;
    }
  }, [map, driverPosition, pickupLat, pickupLng]);

  // Clean up driver marker on unmount
  useEffect(() => {
    return () => {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.map = null;
        driverMarkerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-xl bg-surface px-4 py-2.5 text-sm border border-border-pastel">
        {isDriver ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <span className="font-medium text-text-main">
              Sharing your location with passengers
            </span>
          </>
        ) : driverPosition ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
            </span>
            <span className="font-medium text-text-main">
              Driver is on the way
            </span>
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4 animate-spin text-text-secondary"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-text-secondary">
              Waiting for driver&apos;s location...
            </span>
          </>
        )}
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-xl border border-border-pastel shadow-sm">
        <Map
          defaultCenter={{ lat: pickupLat, lng: pickupLng }}
          defaultZoom={15}
          mapId="live-location-map"
          style={{ width: "100%", height: "250px" }}
          className="sm:!h-[350px]"
          disableDefaultUI={true}
          zoomControl={true}
        />
      </div>
    </div>
  );
}
