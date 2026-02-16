import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestUser, deleteTestUser, type TestUser } from "../helpers/test-user";
import { createTestRide, COORDS } from "../helpers/test-ride";
import { createAdminClient } from "../helpers/supabase-client";
import { cleanupUsers } from "../helpers/cleanup";

let userA: TestUser;
let userB: TestUser;
let userC: TestUser;

beforeAll(async () => {
  userA = await createTestUser("Safety User A");
  userB = await createTestUser("Safety User B");
  userC = await createTestUser("Safety User C");
});

afterAll(async () => {
  await cleanupUsers([userA.id, userB.id, userC.id]);
});

// ---------------------------------------------------------------------------
// block_user
// ---------------------------------------------------------------------------
describe("block_user", () => {
  afterAll(async () => {
    // Clean up blocks created in this describe block
    await userA.client.rpc("unblock_user", { p_blocked_id: userB.id });
  });

  it("blocks a user successfully", async () => {
    const { error } = await userA.client.rpc("block_user", {
      p_blocked_id: userB.id,
    });
    expect(error).toBeNull();

    // Verify row exists via admin
    const admin = createAdminClient();
    const { data } = await admin
      .from("user_blocks")
      .select("*")
      .eq("blocker_id", userA.id)
      .eq("blocked_id", userB.id);

    expect(data).toHaveLength(1);
    expect(data![0].blocker_id).toBe(userA.id);
    expect(data![0].blocked_id).toBe(userB.id);
  });

  it("blocking is idempotent (block same user twice, no error)", async () => {
    // userA already blocked userB above
    const { error } = await userA.client.rpc("block_user", {
      p_blocked_id: userB.id,
    });
    expect(error).toBeNull();

    // Still only one row
    const admin = createAdminClient();
    const { data } = await admin
      .from("user_blocks")
      .select("*")
      .eq("blocker_id", userA.id)
      .eq("blocked_id", userB.id);

    expect(data).toHaveLength(1);
  });

  it("cannot block self", async () => {
    const { error } = await userA.client.rpc("block_user", {
      p_blocked_id: userA.id,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain("Cannot block yourself");
  });
});

// ---------------------------------------------------------------------------
// get_blocked_users
// ---------------------------------------------------------------------------
describe("get_blocked_users", () => {
  beforeAll(async () => {
    // userA blocks both B and C
    await userA.client.rpc("block_user", { p_blocked_id: userB.id });
    await userA.client.rpc("block_user", { p_blocked_id: userC.id });
  });

  afterAll(async () => {
    await userA.client.rpc("unblock_user", { p_blocked_id: userB.id });
    await userA.client.rpc("unblock_user", { p_blocked_id: userC.id });
  });

  it("returns blocked users with details", async () => {
    const { data, error } = await userA.client.rpc("get_blocked_users");
    expect(error).toBeNull();
    expect(data).toHaveLength(2);

    const blockedIds = data!.map((u: any) => u.id);
    expect(blockedIds).toContain(userB.id);
    expect(blockedIds).toContain(userC.id);

    // Verify fields are populated
    const entry = data!.find((u: any) => u.id === userB.id);
    expect(entry.display_name).toBe("Safety User B");
    expect(entry.blocked_at).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// unblock_user
// ---------------------------------------------------------------------------
describe("unblock_user", () => {
  it("unblocks a previously blocked user", async () => {
    // Block then unblock
    await userA.client.rpc("block_user", { p_blocked_id: userB.id });
    const { error } = await userA.client.rpc("unblock_user", {
      p_blocked_id: userB.id,
    });
    expect(error).toBeNull();

    // Verify row removed
    const admin = createAdminClient();
    const { data } = await admin
      .from("user_blocks")
      .select("*")
      .eq("blocker_id", userA.id)
      .eq("blocked_id", userB.id);

    expect(data).toHaveLength(0);
  });

  it("unblocking non-blocked user is no-op (no error)", async () => {
    const { error } = await userA.client.rpc("unblock_user", {
      p_blocked_id: userC.id,
    });
    expect(error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// block effects
// ---------------------------------------------------------------------------
describe("block effects", () => {
  it.skip("blocked user's rides excluded from nearby_rides (nearby_rides does not yet filter blocks)", async () => {
    // A creates a ride Prague -> Brno
    const rideId = await createTestRide({
      driverId: userA.id,
      originLat: COORDS.PRAGUE.lat,
      originLng: COORDS.PRAGUE.lng,
      destLat: COORDS.BRNO.lat,
      destLng: COORDS.BRNO.lng,
    });

    // B blocks A
    await userB.client.rpc("block_user", { p_blocked_id: userA.id });

    try {
      // B searches near A's ride origin/dest — should NOT see A's ride
      const tomorrow = new Date(Date.now() + 86400000)
        .toISOString()
        .split("T")[0];
      const { data, error } = await userB.client.rpc("nearby_rides", {
        origin_lat: COORDS.PRAGUE.lat,
        origin_lng: COORDS.PRAGUE.lng,
        dest_lat: COORDS.BRNO.lat,
        dest_lng: COORDS.BRNO.lng,
        search_date: tomorrow,
      });

      expect(error).toBeNull();
      const rideIds = (data ?? []).map((r: any) => r.ride_id);
      expect(rideIds).not.toContain(rideId);
    } finally {
      await userB.client.rpc("unblock_user", { p_blocked_id: userA.id });
    }
  });

  it("blocked user cannot book (bidirectional)", async () => {
    // Create rides for both users
    const rideByA = await createTestRide({
      driverId: userA.id,
      bookingMode: "instant",
    });
    const rideByB = await createTestRide({
      driverId: userB.id,
      bookingMode: "instant",
    });

    // A blocks B
    await userA.client.rpc("block_user", { p_blocked_id: userB.id });

    try {
      // B tries to book A's ride -> error
      const { error: errBbooksA } = await userB.client.rpc(
        "book_ride_instant",
        {
          p_ride_id: rideByA,
          p_passenger_id: userB.id,
        },
      );
      expect(errBbooksA).not.toBeNull();
      expect(errBbooksA!.message).toContain("Unable to book this ride");

      // A tries to book B's ride -> error (bidirectional)
      const { error: errAbooksB } = await userA.client.rpc(
        "book_ride_instant",
        {
          p_ride_id: rideByB,
          p_passenger_id: userA.id,
        },
      );
      expect(errAbooksB).not.toBeNull();
      expect(errAbooksB!.message).toContain("Unable to book this ride");
    } finally {
      await userA.client.rpc("unblock_user", { p_blocked_id: userB.id });
    }
  });
});

// ---------------------------------------------------------------------------
// report_user
// ---------------------------------------------------------------------------
describe("report_user", () => {
  it("creates report with description and returns report UUID", async () => {
    const { data, error } = await userA.client.rpc("report_user", {
      p_reported_user_id: userB.id,
      p_description: "This user was behaving inappropriately during the ride.",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    // data should be a UUID string
    expect(typeof data).toBe("string");
    expect(data).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("cannot report self", async () => {
    const { error } = await userA.client.rpc("report_user", {
      p_reported_user_id: userA.id,
      p_description: "Trying to report myself, this should fail.",
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Cannot report yourself");
  });

  it("report visible to reporter but not reported user (RLS)", async () => {
    // A reports B
    const { data: reportId } = await userA.client.rpc("report_user", {
      p_reported_user_id: userB.id,
      p_description: "RLS test report — only the reporter should see this.",
    });

    // Reporter (A) queries reports — sees it
    const { data: reporterView } = await userA.client
      .from("reports")
      .select("*")
      .eq("id", reportId);

    expect(reporterView).toHaveLength(1);
    expect(reporterView![0].id).toBe(reportId);

    // Reported user (B) queries reports — should NOT see it
    const { data: reportedView } = await userB.client
      .from("reports")
      .select("*")
      .eq("id", reportId);

    expect(reportedView).toHaveLength(0);
  });
});
