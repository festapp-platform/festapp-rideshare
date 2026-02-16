"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface LocationSharingState {
  isSharing: boolean;
  rideId: string | null;
  passengerNames: string[];
  startSharing: (rideId: string, passengerNames: string[]) => void;
  stopSharing: () => void;
  clearSharing: () => void;
  /** External stop handler set by useLiveLocation to actually stop GPS */
  registerStopHandler: (handler: () => void) => void;
}

const LocationSharingContext = createContext<LocationSharingState | null>(null);

export function LocationSharingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [rideId, setRideId] = useState<string | null>(null);
  const [passengerNames, setPassengerNames] = useState<string[]>([]);
  const [externalStopHandler, setExternalStopHandler] = useState<
    (() => void) | null
  >(null);

  const startSharing = useCallback((rideId: string, names: string[]) => {
    setIsSharing(true);
    setRideId(rideId);
    setPassengerNames(names);
  }, []);

  // Clear state only (no GPS stop) -- used by the hook when it stops itself
  const clearSharing = useCallback(() => {
    setIsSharing(false);
    setRideId(null);
    setPassengerNames([]);
  }, []);

  // Stop from banner: calls registered GPS handler + clears state
  const stopSharing = useCallback(() => {
    externalStopHandler?.();
    setIsSharing(false);
    setRideId(null);
    setPassengerNames([]);
    setExternalStopHandler(null);
  }, [externalStopHandler]);

  const registerStopHandler = useCallback((handler: () => void) => {
    setExternalStopHandler(() => handler);
  }, []);

  return (
    <LocationSharingContext.Provider
      value={{
        isSharing,
        rideId,
        passengerNames,
        startSharing,
        stopSharing,
        clearSharing,
        registerStopHandler,
      }}
    >
      {children}
    </LocationSharingContext.Provider>
  );
}

export function useLocationSharing() {
  const ctx = useContext(LocationSharingContext);
  if (!ctx)
    throw new Error(
      "useLocationSharing must be used within LocationSharingProvider",
    );
  return ctx;
}
