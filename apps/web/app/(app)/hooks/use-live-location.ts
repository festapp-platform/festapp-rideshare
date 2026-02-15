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

interface UseLiveLocationParams {
  rideId: string;
  isDriver: boolean;
  enabled: boolean;
}

interface UseLiveLocationReturn {
  driverPosition: LocationPayload | null;
  isSharing: boolean;
  error: string | null;
  stopSharing: () => void;
}

/**
 * Supabase Broadcast hook for live location sharing.
 *
 * - Both driver and passenger subscribe to the Broadcast channel.
 * - Driver additionally publishes GPS positions when enabled.
 * - Follows the same Broadcast pattern as chat typing indicators.
 */
export function useLiveLocation({
  rideId,
  isDriver,
  enabled,
}: UseLiveLocationParams): UseLiveLocationReturn {
  const supabase = createClient();
  const [driverPosition, setDriverPosition] = useState<LocationPayload | null>(
    null,
  );
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Stop sharing: clear GPS watch and broadcast stop event
  const stopSharing = useCallback(() => {
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
  }, []);

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

  // GPS tracking (driver only, when enabled)
  useEffect(() => {
    if (!isDriver || !enabled || !channelRef.current) return;

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const payload: LocationPayload = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        };

        // Update local state for driver too
        setDriverPosition(payload);
        setIsSharing(true);
        setError(null);

        // Broadcast to passengers
        channelRef.current?.send({
          type: "broadcast",
          event: LOCATION_BROADCAST_EVENT,
          payload,
        });
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: GPS_CONFIG.MAX_AGE_MS,
        timeout: GPS_CONFIG.TIMEOUT_MS,
      },
    );

    watchIdRef.current = watchId;
    setIsSharing(true);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      watchIdRef.current = null;
    };
  }, [isDriver, enabled]);

  return { driverPosition, isSharing, error, stopSharing };
}
