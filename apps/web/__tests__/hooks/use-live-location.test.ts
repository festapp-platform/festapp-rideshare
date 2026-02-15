import { describe, it, expect } from "vitest";
import { getDistanceMeters } from "@/app/(app)/hooks/use-live-location";
import {
  GPS_CONFIG,
  LOCATION_CHANNEL_PREFIX,
  LOCATION_BROADCAST_EVENT,
  LOCATION_STOPPED_EVENT,
} from "@festapp/shared";
import type { LocationPayload } from "@festapp/shared";

describe("getDistanceMeters", () => {
  it("returns 0 for the same point", () => {
    const distance = getDistanceMeters(50.08, 14.43, 50.08, 14.43);
    expect(distance).toBe(0);
  });

  it("calculates Prague to Brno distance (~185 km) within 5% tolerance", () => {
    // Prague (50.08, 14.43) to Brno (49.19, 16.61)
    const distance = getDistanceMeters(50.08, 14.43, 49.19, 16.61);
    const expectedKm = 185;
    const toleranceKm = expectedKm * 0.05;
    expect(distance / 1000).toBeGreaterThan(expectedKm - toleranceKm);
    expect(distance / 1000).toBeLessThan(expectedKm + toleranceKm);
  });

  it("calculates short distance (~100m) within 10% tolerance", () => {
    // Two points approximately 100m apart (roughly 0.0009 degrees lat)
    const baseLat = 50.08;
    const baseLng = 14.43;
    const offsetLat = baseLat + 0.0009; // ~100m north
    const distance = getDistanceMeters(baseLat, baseLng, offsetLat, baseLng);
    expect(distance).toBeGreaterThan(90);
    expect(distance).toBeLessThan(110);
  });

  it("is symmetric (distance A->B equals B->A)", () => {
    const d1 = getDistanceMeters(50.08, 14.43, 49.19, 16.61);
    const d2 = getDistanceMeters(49.19, 16.61, 50.08, 14.43);
    expect(d1).toBeCloseTo(d2, 6);
  });
});

describe("GPS_CONFIG constants", () => {
  it("HIGH_ACCURACY_DISTANCE is 500m", () => {
    expect(GPS_CONFIG.HIGH_ACCURACY_DISTANCE).toBe(500);
  });

  it("FAR_INTERVAL_MS is greater than NEAR_INTERVAL_MS", () => {
    expect(GPS_CONFIG.FAR_INTERVAL_MS).toBeGreaterThan(
      GPS_CONFIG.NEAR_INTERVAL_MS,
    );
  });

  it("DISTANCE_FILTER_FAR is greater than DISTANCE_FILTER_NEAR", () => {
    expect(GPS_CONFIG.DISTANCE_FILTER_FAR).toBeGreaterThan(
      GPS_CONFIG.DISTANCE_FILTER_NEAR,
    );
  });

  it("FAR_INTERVAL_MS is 10000ms (10s)", () => {
    expect(GPS_CONFIG.FAR_INTERVAL_MS).toBe(10000);
  });

  it("NEAR_INTERVAL_MS is 3000ms (3s)", () => {
    expect(GPS_CONFIG.NEAR_INTERVAL_MS).toBe(3000);
  });
});

describe("Channel naming", () => {
  it("LOCATION_CHANNEL_PREFIX + rideId produces expected channel name", () => {
    const rideId = "abc-123";
    const channel = LOCATION_CHANNEL_PREFIX + rideId;
    expect(channel).toBe("live-location-abc-123");
  });

  it("LOCATION_BROADCAST_EVENT is a non-empty string", () => {
    expect(typeof LOCATION_BROADCAST_EVENT).toBe("string");
    expect(LOCATION_BROADCAST_EVENT.length).toBeGreaterThan(0);
  });

  it("LOCATION_STOPPED_EVENT is a non-empty string", () => {
    expect(typeof LOCATION_STOPPED_EVENT).toBe("string");
    expect(LOCATION_STOPPED_EVENT.length).toBeGreaterThan(0);
  });
});

describe("LocationPayload type shape", () => {
  it("accepts valid payload", () => {
    const payload: LocationPayload = {
      lat: 50.08,
      lng: 14.43,
      accuracy: 10,
      heading: 90,
      speed: 15,
      timestamp: Date.now(),
    };
    expect(payload.lat).toBe(50.08);
    expect(payload.lng).toBe(14.43);
  });

  it("accepts null heading and speed", () => {
    const payload: LocationPayload = {
      lat: 50.08,
      lng: 14.43,
      accuracy: 10,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    };
    expect(payload.heading).toBeNull();
    expect(payload.speed).toBeNull();
  });

  it("rejects missing required fields", () => {
    // @ts-expect-error - missing required fields
    const _bad1: LocationPayload = { lat: 50 };
    // @ts-expect-error - missing lng
    const _bad2: LocationPayload = { lat: 50, accuracy: 10, heading: null, speed: null, timestamp: 0 };
    // Suppress unused warnings
    void _bad1;
    void _bad2;
  });
});
