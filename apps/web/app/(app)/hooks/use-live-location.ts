"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LOCATION_CHANNEL_PREFIX,
  LOCATION_BROADCAST_EVENT,
  LOCATION_STOPPED_EVENT,
  GPS_CONFIG,
} from "@festapp/shared";
import type { LocationPayload } from "@festapp/shared";
import { useLocationSharing } from "../contexts/location-sharing-context";

interface UseLiveLocationParams {
  rideId: string;
  isDriver: boolean;
  enabled: boolean;
  pickupLocation?: { lat: number; lng: number } | null;
  passengerNames?: string[];
}

interface UseLiveLocationReturn {
  driverPosition: LocationPayload | null;
  isSharing: boolean;
  error: string | null;
  stopSharing: () => void;
}

/**
 * Haversine distance between two points in meters.
 * Exported for unit testing.
 */
export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Supabase Broadcast hook for live location sharing.
 *
 * - Both driver and passenger subscribe to the Broadcast channel.
 * - Driver additionally publishes GPS positions when enabled.
 * - Adaptive GPS: high frequency near pickup, low frequency when far.
 * - Distance filter: skips broadcast if position hasn't moved enough.
 * - Auto-stop: clears watch on unmount or when sharing is disabled.
 */
export function useLiveLocation({
  rideId,
  isDriver,
  enabled,
  pickupLocation,
  passengerNames,
}: UseLiveLocationParams): UseLiveLocationReturn {
  const supabase = createClient();

  // Optional integration with global location sharing context (LEGAL-03)
  let locationSharingCtx: ReturnType<typeof useLocationSharing> | null = null;
  try {
    locationSharingCtx = useLocationSharing();
  } catch {
    // Not inside LocationSharingProvider (e.g., tests)
  }
  const [driverPosition, setDriverPosition] = useState<LocationPayload | null>(
    null,
  );
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const modeRef = useRef<"far" | "near">("far");
  const lastBroadcastRef = useRef<number>(0);
  const lastBroadcastPositionRef = useRef<{ lat: number; lng: number } | null>(
    null,
  );
  const contextNotifiedRef = useRef(false);

  // Raw GPS cleanup: clears watch and broadcasts stop (no context clearing)
  // This is registered with the context so the banner stop button can trigger it
  const rawGpsStop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Broadcast stop event so passengers know sharing ended
    channelRef.current?.send({
      type: "broadcast",
      event: LOCATION_STOPPED_EVENT,
      payload: {},
    });

    setIsSharing(false);
    modeRef.current = "far";
    lastBroadcastRef.current = 0;
    lastBroadcastPositionRef.current = null;
  }, []);

  // Public stop: clears GPS + clears context state
  const stopSharing = useCallback(() => {
    rawGpsStop();
    locationSharingCtx?.clearSharing();
  }, [rawGpsStop, locationSharingCtx]);

  // Subscribe to Broadcast channel (both driver and passenger)
  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel(LOCATION_CHANNEL_PREFIX + rideId)
      .on("broadcast", { event: LOCATION_BROADCAST_EVENT }, (payload) => {
        const position = payload.payload as LocationPayload;
        setDriverPosition(position);
        setIsSharing(true);
      })
      .on("broadcast", { event: LOCATION_STOPPED_EVENT }, () => {
        setDriverPosition(null);
        setIsSharing(false);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [rideId, supabase]);

  // GPS tracking (driver only, when enabled) with adaptive frequency
  useEffect(() => {
    if (!isDriver || !enabled || !channelRef.current) return;

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    function startWatch(mode: "far" | "near") {
      // Clear existing watch if any
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      const isNear = mode === "near";
      const options: PositionOptions = {
        enableHighAccuracy: isNear,
        maximumAge: isNear ? 0 : GPS_CONFIG.MAX_AGE_MS,
        timeout: GPS_CONFIG.TIMEOUT_MS,
      };

      const intervalMs = isNear
        ? GPS_CONFIG.NEAR_INTERVAL_MS
        : GPS_CONFIG.FAR_INTERVAL_MS;
      const distanceFilter = isNear
        ? GPS_CONFIG.DISTANCE_FILTER_NEAR
        : GPS_CONFIG.DISTANCE_FILTER_FAR;

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;

          // Distance filter: skip if position hasn't moved enough
          if (lastBroadcastPositionRef.current) {
            const moved = getDistanceMeters(
              lastBroadcastPositionRef.current.lat,
              lastBroadcastPositionRef.current.lng,
              currentLat,
              currentLng,
            );
            if (moved < distanceFilter) return;
          }

          // Time throttle: skip if broadcast too recently
          const now = Date.now();
          if (now - lastBroadcastRef.current < intervalMs) return;

          const payload: LocationPayload = {
            lat: currentLat,
            lng: currentLng,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };

          // Update local state for driver too
          setDriverPosition(payload);
          setIsSharing(true);
          setError(null);

          // Notify global location sharing context on first position (LEGAL-03)
          if (!contextNotifiedRef.current && locationSharingCtx) {
            locationSharingCtx.startSharing(rideId, passengerNames ?? []);
            locationSharingCtx.registerStopHandler(rawGpsStop);
            contextNotifiedRef.current = true;
          }

          // Broadcast to passengers
          channelRef.current?.send({
            type: "broadcast",
            event: LOCATION_BROADCAST_EVENT,
            payload,
          });

          lastBroadcastRef.current = now;
          lastBroadcastPositionRef.current = { lat: currentLat, lng: currentLng };

          // Adaptive mode switching: check distance to pickup
          if (pickupLocation) {
            const distToPickup = getDistanceMeters(
              currentLat,
              currentLng,
              pickupLocation.lat,
              pickupLocation.lng,
            );

            const shouldBeNear =
              distToPickup <= GPS_CONFIG.HIGH_ACCURACY_DISTANCE;
            const newMode = shouldBeNear ? "near" : "far";

            if (newMode !== modeRef.current) {
              modeRef.current = newMode;
              // Restart watch with new options
              startWatch(newMode);
            }
          }
        },
        (err) => {
          setError(err.message);
        },
        options,
      );

      watchIdRef.current = watchId;
      modeRef.current = mode;
      setIsSharing(true);
    }

    // Start in far mode by default
    startWatch("far");

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Clear global context on unmount so banner disappears
      if (contextNotifiedRef.current) {
        locationSharingCtx?.clearSharing();
        contextNotifiedRef.current = false;
      }
    };
  }, [isDriver, enabled, pickupLocation, locationSharingCtx, rawGpsStop, rideId, passengerNames]);

  return { driverPosition, isSharing, error, stopSharing };
}
