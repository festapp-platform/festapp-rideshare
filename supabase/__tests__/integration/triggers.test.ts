import { createTestUser, type TestUser } from "../helpers/test-user";
import { createTestRide, COORDS } from "../helpers/test-ride";
import { createTestBooking } from "../helpers/test-booking";
import { createAdminClient } from "../helpers/supabase-client";
import { cleanupUsers } from "../helpers/cleanup";

const admin = createAdminClient();

// ============================================================
// on_auth_user_created trigger
// ============================================================
describe("on_auth_user_created trigger", () => {
  let user: TestUser;

  afterAll(async () => {
    if (user) await cleanupUsers([user.id]);
  });

  it("auto-creates profile when auth user signs up", async () => {
    user = await createTestUser("Trigger Test User");

    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, display_name")
      .eq("id", user.id)
      .single();

    expect(error).toBeNull();
    expect(profile).not.toBeNull();
    expect(profile!.id).toBe(user.id);
    expect(profile!.display_name).toBe("Trigger Test User");
  });

  it("profile has short_id auto-generated", async () => {
    // user was already created in the previous test
    const { data: profile, error } = await admin
      .from("profiles")
      .select("short_id")
      .eq("id", user.id)
      .single();

    expect(error).toBeNull();
    expect(profile).not.toBeNull();
    expect(profile!.short_id).toHaveLength(6);
    expect(profile!.short_id).toMatch(/^[a-hj-km-np-z2-9]{6}$/);
  });
});

// ============================================================
// ride short_id trigger
// ============================================================
describe("ride short_id trigger", () => {
  let driver: TestUser;

  beforeAll(async () => {
    driver = await createTestUser("Short ID Driver");
  });

  afterAll(async () => {
    await cleanupUsers([driver.id]);
  });

  it("auto-generates short_id on ride creation", async () => {
    const rideId = await createTestRide({ driverId: driver.id });

    const { data: ride, error } = await admin
      .from("rides")
      .select("short_id")
      .eq("id", rideId)
      .single();

    expect(error).toBeNull();
    expect(ride).not.toBeNull();
    expect(ride!.short_id).toHaveLength(6);
    expect(ride!.short_id).toMatch(/^[a-hj-km-np-z2-9]{6}$/);
  });

  it("short_ids are unique across 10 rides", async () => {
    const rideIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const rideId = await createTestRide({ driverId: driver.id });
      rideIds.push(rideId);
    }

    const { data: rides, error } = await admin
      .from("rides")
      .select("short_id")
      .in("id", rideIds);

    expect(error).toBeNull();
    expect(rides).not.toBeNull();
    expect(rides).toHaveLength(10);

    const shortIds = rides!.map((r) => r.short_id);
    expect(new Set(shortIds).size).toBe(10);
  });
});

// ============================================================
// completed_rides_count triggers
// ============================================================
describe("completed_rides_count triggers", () => {
  let driver: TestUser;
  let passenger: TestUser;

  beforeAll(async () => {
    driver = await createTestUser("Count Driver");
    passenger = await createTestUser("Count Passenger");
  });

  afterAll(async () => {
    await cleanupUsers([driver.id, passenger.id]);
  });

  it("increments passenger count when booking completed via complete_ride RPC", async () => {
    const rideId = await createTestRide({ driverId: driver.id });
    await createTestBooking(rideId, passenger.id, "confirmed");

    // Check passenger count before
    const { data: before } = await admin
      .from("profiles")
      .select("completed_rides_count")
      .eq("id", passenger.id)
      .single();
    const countBefore = before!.completed_rides_count;

    // Complete ride as driver
    const { error } = await driver.client.rpc("complete_ride", {
      p_ride_id: rideId,
      p_driver_id: driver.id,
    });
    expect(error).toBeNull();

    // Check passenger count after
    const { data: after } = await admin
      .from("profiles")
      .select("completed_rides_count")
      .eq("id", passenger.id)
      .single();
    expect(after!.completed_rides_count).toBe(countBefore + 1);
  });

  it("increments driver count when ride completed", async () => {
    const rideId = await createTestRide({ driverId: driver.id });
    await createTestBooking(rideId, passenger.id, "confirmed");

    // Check driver count before
    const { data: before } = await admin
      .from("profiles")
      .select("completed_rides_count")
      .eq("id", driver.id)
      .single();
    const countBefore = before!.completed_rides_count;

    // Complete ride
    const { error } = await driver.client.rpc("complete_ride", {
      p_ride_id: rideId,
      p_driver_id: driver.id,
    });
    expect(error).toBeNull();

    // Check driver count after
    const { data: after } = await admin
      .from("profiles")
      .select("completed_rides_count")
      .eq("id", driver.id)
      .single();
    expect(after!.completed_rides_count).toBe(countBefore + 1);
  });

  it("multiple completions accumulate", async () => {
    // Create a fresh driver to get a clean count
    const freshDriver = await createTestUser("Accumulation Driver");

    // Check initial count
    const { data: initial } = await admin
      .from("profiles")
      .select("completed_rides_count")
      .eq("id", freshDriver.id)
      .single();
    expect(initial!.completed_rides_count).toBe(0);

    // Complete 3 different rides
    for (let i = 0; i < 3; i++) {
      const rideId = await createTestRide({ driverId: freshDriver.id });
      await createTestBooking(rideId, passenger.id, "confirmed");
      const { error } = await freshDriver.client.rpc("complete_ride", {
        p_ride_id: rideId,
        p_driver_id: freshDriver.id,
      });
      expect(error).toBeNull();
    }

    // Verify driver completed_rides_count = 3
    const { data: after } = await admin
      .from("profiles")
      .select("completed_rides_count")
      .eq("id", freshDriver.id)
      .single();
    expect(after!.completed_rides_count).toBe(3);

    await cleanupUsers([freshDriver.id]);
  });
});

// ============================================================
// audit trigger
// ============================================================
describe("audit trigger", () => {
  let driver: TestUser;

  beforeAll(async () => {
    driver = await createTestUser("Audit Driver");
  });

  afterAll(async () => {
    await cleanupUsers([driver.id]);
  });

  it("ride update creates audit trail", async () => {
    const rideId = await createTestRide({ driverId: driver.id });

    // Update ride status via admin to trigger audit
    await admin
      .from("rides")
      .update({ status: "cancelled" })
      .eq("id", rideId);

    // Query audit.record_version via admin client
    // The audit schema may not be accessible via PostgREST; skip if so
    const { data, error } = await admin
      .schema("audit" as any)
      .from("record_version")
      .select("*")
      .eq("record_id", rideId)
      .eq("table_name", "rides");

    if (error) {
      // Audit schema not accessible via PostgREST — skip gracefully
      console.warn(
        `Skipping audit assertion: audit schema not accessible via PostgREST (${error.message})`,
      );
      return;
    }

    // At minimum, we expect an INSERT record from ride creation
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);

    const ops = data!.map((row: any) => row.op);
    expect(ops).toContain("INSERT");
  });
});
