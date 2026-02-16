import { createTestUser, type TestUser } from "../helpers/test-user.js";
import { createTestRide, COORDS } from "../helpers/test-ride.js";
import { createAdminClient } from "../helpers/supabase-client.js";
import { cleanupUsers } from "../helpers/cleanup.js";

const admin = createAdminClient();

let driver: TestUser;
let passenger: TestUser;

/** Use a date 30 days out to avoid collisions with other test rides */
const searchDate = new Date(Date.now() + 30 * 86400000);
const tomorrow = searchDate.toISOString().split("T")[0];
const tomorrowNoon = new Date(searchDate);
tomorrowNoon.setHours(12, 0, 0, 0);

beforeAll(async () => {
  driver = await createTestUser("Rides Driver");
  passenger = await createTestUser("Rides Passenger");
});

afterAll(async () => {
  await cleanupUsers([driver.id, passenger.id]);
});

describe("rides", () => {
  let rideId: string;

  it("creates ride via _test_create_ride RPC", async () => {
    rideId = await createTestRide({
      driverId: driver.id,
      originLat: COORDS.PRAGUE.lat,
      originLng: COORDS.PRAGUE.lng,
      destLat: COORDS.BRNO.lat,
      destLng: COORDS.BRNO.lng,
      departureTime: tomorrowNoon.toISOString(),
      seatsTotal: 4,
      priceCzk: 250,
    });

    expect(rideId).toBeTruthy();

    // Verify ride exists
    const { data, error } = await admin
      .from("rides")
      .select("id, driver_id, seats_available, price_czk")
      .eq("id", rideId)
      .single();

    expect(error).toBeNull();
    expect(data!.driver_id).toBe(driver.id);
    expect(data!.seats_available).toBe(4);
    expect(Number(data!.price_czk)).toBe(250);
  });

  it("search via nearby_rides RPC finds the ride", async () => {
    const { data, error } = await passenger.client.rpc("nearby_rides", {
      origin_lat: COORDS.PRAGUE.lat,
      origin_lng: COORDS.PRAGUE.lng,
      dest_lat: COORDS.BRNO.lat,
      dest_lng: COORDS.BRNO.lng,
      search_date: tomorrow,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const ride = data!.find((r: any) => r.ride_id === rideId);
    expect(ride).toBeDefined();
    expect(ride.origin_distance_m).toBeGreaterThanOrEqual(0);
    expect(ride.dest_distance_m).toBeGreaterThanOrEqual(0);
  });

  it("driver can update ride price", async () => {
    const { error } = await driver.client
      .from("rides")
      .update({ price_czk: 300 })
      .eq("id", rideId);

    expect(error).toBeNull();

    const { data } = await admin
      .from("rides")
      .select("price_czk")
      .eq("id", rideId)
      .single();

    expect(Number(data!.price_czk)).toBe(300);
  });

  it("non-owner cannot update ride (RLS)", async () => {
    const { error } = await passenger.client
      .from("rides")
      .update({ price_czk: 999 })
      .eq("id", rideId);

    // RLS silently filters -- no error but no rows affected
    // Verify price unchanged
    const { data } = await admin
      .from("rides")
      .select("price_czk")
      .eq("id", rideId)
      .single();

    expect(Number(data!.price_czk)).toBe(300);
  });

  it("driver can delete ride", async () => {
    const { error } = await driver.client
      .from("rides")
      .delete()
      .eq("id", rideId);

    expect(error).toBeNull();

    const { data } = await admin
      .from("rides")
      .select("id")
      .eq("id", rideId)
      .single();

    expect(data).toBeNull();
  });
});
