import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestUser, type TestUser } from "../helpers/test-user";
import { createTestRide, COORDS } from "../helpers/test-ride";
import { createAdminClient } from "../helpers/supabase-client";
import { cleanupUsers } from "../helpers/cleanup";

let driver: TestUser;
let passenger: TestUser;

/** Use a date 30 days out to avoid collisions with default rides from other tests */
const searchDate = new Date(Date.now() + 30 * 86400000);
const tomorrow = searchDate.toISOString().split("T")[0];

/** Departure time: 30 days from now at noon */
const tomorrowNoon = new Date(searchDate);
tomorrowNoon.setHours(12, 0, 0, 0);

let baseRideId: string;

beforeAll(async () => {
  driver = await createTestUser("Search Driver");
  passenger = await createTestUser("Search Passenger");

  // Setup ride: Prague -> Brno departing tomorrow at noon
  baseRideId = await createTestRide({
    driverId: driver.id,
    originLat: COORDS.PRAGUE.lat,
    originLng: COORDS.PRAGUE.lng,
    originAddress: "Prague Old Town",
    destLat: COORDS.BRNO.lat,
    destLng: COORDS.BRNO.lng,
    destAddress: "Brno Center",
    departureTime: tomorrowNoon.toISOString(),
    seatsTotal: 4,
    seatsAvailable: 4,
    priceCzk: 250,
    bookingMode: "instant",
  });
});

afterAll(async () => {
  await cleanupUsers([driver.id, passenger.id]);
});

// ---------------------------------------------------------------------------
// nearby_rides - point matching
// ---------------------------------------------------------------------------
describe("nearby_rides - point matching", () => {
  it("finds ride with origin/dest within default radius (15km)", async () => {
    const { data, error } = await passenger.client.rpc("nearby_rides", {
      origin_lat: COORDS.PRAGUE.lat,
      origin_lng: COORDS.PRAGUE.lng,
      dest_lat: COORDS.BRNO.lat,
      dest_lng: COORDS.BRNO.lng,
      search_date: tomorrow,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const ride = data!.find((r: any) => r.ride_id === baseRideId);
    expect(ride).toBeDefined();
    expect(ride.origin_distance_m).toBeDefined();
    expect(ride.origin_distance_m).toBeGreaterThanOrEqual(0);
    expect(ride.dest_distance_m).toBeDefined();
    expect(ride.dest_distance_m).toBeGreaterThanOrEqual(0);
  });

  it("excludes ride outside radius", async () => {
    // Plzen is ~90km from Prague — radius_km=5 should exclude
    const { data, error } = await passenger.client.rpc("nearby_rides", {
      origin_lat: COORDS.PLZEN.lat,
      origin_lng: COORDS.PLZEN.lng,
      dest_lat: COORDS.BRNO.lat,
      dest_lng: COORDS.BRNO.lng,
      search_date: tomorrow,
      radius_km: 5,
    });

    expect(error).toBeNull();
    const rideIds = (data ?? []).map((r: any) => r.ride_id);
    expect(rideIds).not.toContain(baseRideId);
  });

  it("respects date window", async () => {
    // Create a ride departing 3 days from now
    const threeDaysOut = new Date(Date.now() + 3 * 86400000);
    threeDaysOut.setHours(12, 0, 0, 0);

    const futureRideId = await createTestRide({
      driverId: driver.id,
      departureTime: threeDaysOut.toISOString(),
    });

    // Search with today's date — 2-day window should exclude ride 3 days out
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await passenger.client.rpc("nearby_rides", {
      origin_lat: COORDS.PRAGUE.lat,
      origin_lng: COORDS.PRAGUE.lng,
      dest_lat: COORDS.BRNO.lat,
      dest_lng: COORDS.BRNO.lng,
      search_date: today,
    });

    expect(error).toBeNull();
    const rideIds = (data ?? []).map((r: any) => r.ride_id);
    expect(rideIds).not.toContain(futureRideId);
  });

  it("only returns upcoming rides with available seats", async () => {
    // Create a completed ride
    const completedRideId = await createTestRide({
      driverId: driver.id,
      status: "completed",
      departureTime: tomorrowNoon.toISOString(),
    });

    // Create a ride with 0 seats available
    const fullRideId = await createTestRide({
      driverId: driver.id,
      seatsTotal: 4,
      seatsAvailable: 0,
      departureTime: tomorrowNoon.toISOString(),
    });

    const { data, error } = await passenger.client.rpc("nearby_rides", {
      origin_lat: COORDS.PRAGUE.lat,
      origin_lng: COORDS.PRAGUE.lng,
      dest_lat: COORDS.BRNO.lat,
      dest_lng: COORDS.BRNO.lng,
      search_date: tomorrow,
    });

    expect(error).toBeNull();
    const rideIds = (data ?? []).map((r: any) => r.ride_id);
    expect(rideIds).not.toContain(completedRideId);
    expect(rideIds).not.toContain(fullRideId);
  });

  it("returns driver info (driver_name, driver_rating, vehicle fields)", async () => {
    const { data, error } = await passenger.client.rpc("nearby_rides", {
      origin_lat: COORDS.PRAGUE.lat,
      origin_lng: COORDS.PRAGUE.lng,
      dest_lat: COORDS.BRNO.lat,
      dest_lng: COORDS.BRNO.lng,
      search_date: tomorrow,
    });

    expect(error).toBeNull();

    const ride = data!.find((r: any) => r.ride_id === baseRideId);
    expect(ride).toBeDefined();
    expect(ride.driver_id).toBe(driver.id);
    expect(ride.driver_name).toBe("Search Driver");
    // driver_rating and vehicle fields may be null for test users without
    // reviews/vehicles, but the columns should be present
    expect(ride).toHaveProperty("driver_rating");
    expect(ride).toHaveProperty("vehicle_make");
    expect(ride).toHaveProperty("vehicle_model");
    expect(ride).toHaveProperty("vehicle_color");
  });
});

// ---------------------------------------------------------------------------
// nearby_rides - route corridor
// ---------------------------------------------------------------------------
describe("nearby_rides - route corridor", () => {
  let corridorRideId: string;

  beforeAll(async () => {
    // Create a ride with route_geometry: Prague -> Jihlava -> Brno
    corridorRideId = await createTestRide({
      driverId: driver.id,
      originLat: COORDS.PRAGUE.lat,
      originLng: COORDS.PRAGUE.lng,
      destLat: COORDS.BRNO.lat,
      destLng: COORDS.BRNO.lng,
      departureTime: tomorrowNoon.toISOString(),
      routeGeometry:
        "LINESTRING(14.4378 50.0755, 15.5912 49.3961, 16.6068 49.1951)",
    });
  });

  it("finds ride whose route passes near midpoint", async () => {
    // Search with origin near Jihlava (midpoint on the route)
    const { data, error } = await passenger.client.rpc("nearby_rides", {
      origin_lat: COORDS.JIHLAVA.lat,
      origin_lng: COORDS.JIHLAVA.lng,
      dest_lat: COORDS.BRNO.lat,
      dest_lng: COORDS.BRNO.lng,
      search_date: tomorrow,
    });

    expect(error).toBeNull();
    const rideIds = (data ?? []).map((r: any) => r.ride_id);
    expect(rideIds).toContain(corridorRideId);
  });

  it("excludes ride whose route does NOT pass near search point", async () => {
    // Karlovy Vary is ~130km west of Prague, not near Prague-Jihlava-Brno route
    const { data, error } = await passenger.client.rpc("nearby_rides", {
      origin_lat: COORDS.KARLOVY_VARY.lat,
      origin_lng: COORDS.KARLOVY_VARY.lng,
      dest_lat: COORDS.BRNO.lat,
      dest_lng: COORDS.BRNO.lng,
      search_date: tomorrow,
      radius_km: 15,
    });

    expect(error).toBeNull();
    const rideIds = (data ?? []).map((r: any) => r.ride_id);
    expect(rideIds).not.toContain(corridorRideId);
  });

  it("block-aware: excludes rides from blocked drivers", async () => {
    // Passenger blocks driver
    await passenger.client.rpc("block_user", { p_blocked_id: driver.id });

    try {
      const { data, error } = await passenger.client.rpc("nearby_rides", {
        origin_lat: COORDS.PRAGUE.lat,
        origin_lng: COORDS.PRAGUE.lng,
        dest_lat: COORDS.BRNO.lat,
        dest_lng: COORDS.BRNO.lng,
        search_date: tomorrow,
      });

      expect(error).toBeNull();
      // No rides from this driver should appear
      const rideIds = (data ?? []).map((r: any) => r.ride_id);
      expect(rideIds).not.toContain(baseRideId);
      expect(rideIds).not.toContain(corridorRideId);
    } finally {
      await passenger.client.rpc("unblock_user", { p_blocked_id: driver.id });
    }
  });
});
