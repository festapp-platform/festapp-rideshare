import { createTestUser, type TestUser } from "../helpers/test-user";
import { createTestRide } from "../helpers/test-ride";
import { createTestBooking } from "../helpers/test-booking";
import { createAdminClient } from "../helpers/supabase-client";
import { cleanupUsers } from "../helpers/cleanup";

const admin = createAdminClient();

let driver: TestUser;
let passenger1: TestUser;
let passenger2: TestUser;

beforeAll(async () => {
  driver = await createTestUser("Rides Driver");
  passenger1 = await createTestUser("Rides Passenger 1");
  passenger2 = await createTestUser("Rides Passenger 2");
});

afterAll(async () => {
  await cleanupUsers([driver.id, passenger1.id, passenger2.id]);
});

// ============================================================
// cancel_ride
// ============================================================
describe("cancel_ride", () => {
  it("cancels ride and cascades to all bookings", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 4 });

    // Create bookings via admin helper (confirmed + pending)
    const confirmedBookingId = await createTestBooking(rideId, passenger1.id, "confirmed", 1);
    const pendingBookingId = await createTestBooking(rideId, passenger2.id, "pending", 1);

    // Driver cancels ride
    const { error } = await driver.client.rpc("cancel_ride", {
      p_ride_id: rideId,
      p_driver_id: driver.id,
      p_reason: "Weather is bad",
    });

    expect(error).toBeNull();

    // Verify ride is cancelled
    const { data: ride } = await admin
      .from("rides")
      .select("status, cancellation_reason")
      .eq("id", rideId)
      .single();
    expect(ride!.status).toBe("cancelled");
    expect(ride!.cancellation_reason).toBe("Weather is bad");

    // Verify both bookings are cancelled
    const { data: confirmedBooking } = await admin
      .from("bookings")
      .select("status, cancellation_reason")
      .eq("id", confirmedBookingId)
      .single();
    expect(confirmedBooking!.status).toBe("cancelled");
    expect(confirmedBooking!.cancellation_reason).toBe("Weather is bad");

    const { data: pendingBooking } = await admin
      .from("bookings")
      .select("status, cancellation_reason")
      .eq("id", pendingBookingId)
      .single();
    expect(pendingBooking!.status).toBe("cancelled");
  });

  it("rejects cancel by non-driver", async () => {
    const rideId = await createTestRide({ driverId: driver.id });

    const { error } = await passenger1.client.rpc("cancel_ride", {
      p_ride_id: rideId,
      p_driver_id: passenger1.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Cannot cancel this ride");
  });

  it("rejects cancel of non-upcoming ride (completed)", async () => {
    const rideId = await createTestRide({ driverId: driver.id, status: "completed" });

    const { error } = await driver.client.rpc("cancel_ride", {
      p_ride_id: rideId,
      p_driver_id: driver.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Cannot cancel this ride");
  });
});

// ============================================================
// start_ride
// ============================================================
describe("start_ride", () => {
  it("transitions ride from upcoming to in_progress", async () => {
    const rideId = await createTestRide({ driverId: driver.id });

    const { error } = await driver.client.rpc("start_ride", {
      p_ride_id: rideId,
      p_driver_id: driver.id,
    });

    expect(error).toBeNull();

    // Verify ride status
    const { data: ride } = await admin.from("rides").select("status").eq("id", rideId).single();
    expect(ride!.status).toBe("in_progress");
  });

  it("rejects start by non-driver", async () => {
    const rideId = await createTestRide({ driverId: driver.id });

    const { error } = await passenger1.client.rpc("start_ride", {
      p_ride_id: rideId,
      p_driver_id: passenger1.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Only the driver can start a ride");
  });

  it("rejects start of non-upcoming ride (already started)", async () => {
    const rideId = await createTestRide({ driverId: driver.id, status: "in_progress" });

    const { error } = await driver.client.rpc("start_ride", {
      p_ride_id: rideId,
      p_driver_id: driver.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Ride can only be started from upcoming status");
  });

  it("rejects start of non-existent ride", async () => {
    const fakeRideId = "00000000-0000-0000-0000-000000000000";

    const { error } = await driver.client.rpc("start_ride", {
      p_ride_id: fakeRideId,
      p_driver_id: driver.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Ride not found");
  });
});

// ============================================================
// complete_ride
// ============================================================
describe("complete_ride", () => {
  it("completes ride and transitions confirmed bookings to completed, pending to cancelled", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 4 });

    // Create one confirmed and one pending booking
    const confirmedBookingId = await createTestBooking(rideId, passenger1.id, "confirmed", 1);
    const pendingBookingId = await createTestBooking(rideId, passenger2.id, "pending", 1);

    // Driver completes ride
    const { error } = await driver.client.rpc("complete_ride", {
      p_ride_id: rideId,
      p_driver_id: driver.id,
    });

    expect(error).toBeNull();

    // Verify ride is completed
    const { data: ride } = await admin.from("rides").select("status").eq("id", rideId).single();
    expect(ride!.status).toBe("completed");

    // Confirmed booking transitions to completed
    const { data: confirmedBooking } = await admin
      .from("bookings")
      .select("status")
      .eq("id", confirmedBookingId)
      .single();
    expect(confirmedBooking!.status).toBe("completed");

    // Pending booking transitions to cancelled
    const { data: pendingBooking } = await admin
      .from("bookings")
      .select("status, cancellation_reason")
      .eq("id", pendingBookingId)
      .single();
    expect(pendingBooking!.status).toBe("cancelled");
    expect(pendingBooking!.cancellation_reason).toBe("Ride completed");
  });

  it("can complete from in_progress status", async () => {
    const rideId = await createTestRide({ driverId: driver.id, status: "in_progress" });

    const { error } = await driver.client.rpc("complete_ride", {
      p_ride_id: rideId,
      p_driver_id: driver.id,
    });

    expect(error).toBeNull();

    const { data: ride } = await admin.from("rides").select("status").eq("id", rideId).single();
    expect(ride!.status).toBe("completed");
  });

  it("rejects complete of already-cancelled ride", async () => {
    const rideId = await createTestRide({ driverId: driver.id, status: "cancelled" });

    const { error } = await driver.client.rpc("complete_ride", {
      p_ride_id: rideId,
      p_driver_id: driver.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Ride cannot be completed from current status");
  });
});
