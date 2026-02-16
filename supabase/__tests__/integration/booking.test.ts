import { createTestUser, type TestUser } from "../helpers/test-user";
import { createTestRide, COORDS } from "../helpers/test-ride";
import { createTestBooking } from "../helpers/test-booking";
import { createAdminClient } from "../helpers/supabase-client";
import { cleanupUsers } from "../helpers/cleanup";

const admin = createAdminClient();

let driver: TestUser;
let passenger1: TestUser;
let passenger2: TestUser;

beforeAll(async () => {
  driver = await createTestUser("Booking Driver");
  passenger1 = await createTestUser("Booking Passenger 1");
  passenger2 = await createTestUser("Booking Passenger 2");
});

afterAll(async () => {
  await cleanupUsers([driver.id, passenger1.id, passenger2.id]);
});

// ============================================================
// book_ride_instant
// ============================================================
describe("book_ride_instant", () => {
  it("books a seat and decrements seats_available atomically", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 4 });

    const { data: bookingId, error } = await passenger1.client.rpc("book_ride_instant", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
      p_seats: 2,
    });

    expect(error).toBeNull();
    expect(bookingId).toBeTruthy();

    // Verify seats decremented
    const { data: ride } = await admin.from("rides").select("seats_available").eq("id", rideId).single();
    expect(ride!.seats_available).toBe(2);

    // Verify booking created as confirmed
    const { data: booking } = await admin
      .from("bookings")
      .select("status, seats_booked, passenger_id")
      .eq("id", bookingId)
      .single();
    expect(booking!.status).toBe("confirmed");
    expect(booking!.seats_booked).toBe(2);
    expect(booking!.passenger_id).toBe(passenger1.id);
  });

  it("rejects booking on request-mode ride", async () => {
    const rideId = await createTestRide({ driverId: driver.id, bookingMode: "request" });

    const { error } = await passenger1.client.rpc("book_ride_instant", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Ride requires request approval");
  });

  it("rejects driver booking own ride", async () => {
    const rideId = await createTestRide({ driverId: driver.id });

    const { error } = await driver.client.rpc("book_ride_instant", {
      p_ride_id: rideId,
      p_passenger_id: driver.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Driver cannot book own ride");
  });

  it("rejects when not enough seats available", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 1 });

    const { error } = await passenger1.client.rpc("book_ride_instant", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
      p_seats: 3,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Not enough seats available");
  });

  it("rejects duplicate booking by same passenger", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 4 });

    // First booking succeeds
    const { error: err1 } = await passenger1.client.rpc("book_ride_instant", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
    });
    expect(err1).toBeNull();

    // Duplicate booking fails
    const { error: err2 } = await passenger1.client.rpc("book_ride_instant", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
    });

    expect(err2).not.toBeNull();
    expect(err2!.message).toContain("Already booked on this ride");
  });

  it("rejects booking on non-upcoming ride", async () => {
    const rideId = await createTestRide({ driverId: driver.id, status: "completed" });

    const { error } = await passenger1.client.rpc("book_ride_instant", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Ride is not available for booking");
  });

  it("rejects booking when blocked by driver", async () => {
    const rideId = await createTestRide({ driverId: driver.id });

    // Driver blocks the passenger
    const { error: blockError } = await driver.client.rpc("block_user", {
      p_blocked_id: passenger2.id,
    });
    expect(blockError).toBeNull();

    // Blocked passenger tries to book
    const { error } = await passenger2.client.rpc("book_ride_instant", {
      p_ride_id: rideId,
      p_passenger_id: passenger2.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Unable to book this ride");

    // Cleanup: unblock for other tests
    await driver.client.rpc("unblock_user", { p_blocked_id: passenger2.id });
  });
});

// ============================================================
// request_ride_booking
// ============================================================
describe("request_ride_booking", () => {
  it("creates pending booking without decrementing seats", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 4, bookingMode: "request" });

    const { data: bookingId, error } = await passenger1.client.rpc("request_ride_booking", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
    });

    expect(error).toBeNull();
    expect(bookingId).toBeTruthy();

    // Verify seats NOT decremented
    const { data: ride } = await admin.from("rides").select("seats_available").eq("id", rideId).single();
    expect(ride!.seats_available).toBe(4);

    // Verify booking is pending
    const { data: booking } = await admin.from("bookings").select("status").eq("id", bookingId).single();
    expect(booking!.status).toBe("pending");
  });
});

// ============================================================
// respond_to_booking
// ============================================================
describe("respond_to_booking", () => {
  it("driver accepts pending booking, seats decrement", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 4, bookingMode: "request" });

    // Create a pending booking via RPC
    const { data: bookingId } = await passenger1.client.rpc("request_ride_booking", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
      p_seats: 2,
    });

    // Driver accepts
    const { error } = await driver.client.rpc("respond_to_booking", {
      p_booking_id: bookingId,
      p_driver_id: driver.id,
      p_accept: true,
    });

    expect(error).toBeNull();

    // Verify booking is confirmed
    const { data: booking } = await admin.from("bookings").select("status").eq("id", bookingId).single();
    expect(booking!.status).toBe("confirmed");

    // Verify seats decremented
    const { data: ride } = await admin.from("rides").select("seats_available").eq("id", rideId).single();
    expect(ride!.seats_available).toBe(2);
  });

  it("driver rejects pending booking, no seat change", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 4, bookingMode: "request" });

    const { data: bookingId } = await passenger1.client.rpc("request_ride_booking", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
    });

    // Driver rejects
    const { error } = await driver.client.rpc("respond_to_booking", {
      p_booking_id: bookingId,
      p_driver_id: driver.id,
      p_accept: false,
    });

    expect(error).toBeNull();

    // Verify booking is cancelled
    const { data: booking } = await admin.from("bookings").select("status").eq("id", bookingId).single();
    expect(booking!.status).toBe("cancelled");

    // Verify seats unchanged
    const { data: ride } = await admin.from("rides").select("seats_available").eq("id", rideId).single();
    expect(ride!.seats_available).toBe(4);
  });

  it("non-driver cannot respond to booking", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 4, bookingMode: "request" });

    const { data: bookingId } = await passenger1.client.rpc("request_ride_booking", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
    });

    // Passenger2 (not the driver) tries to respond
    const { error } = await passenger2.client.rpc("respond_to_booking", {
      p_booking_id: bookingId,
      p_driver_id: passenger2.id,
      p_accept: true,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Only the driver can respond to booking requests");
  });
});

// ============================================================
// cancel_booking
// ============================================================
describe("cancel_booking", () => {
  it("passenger cancels confirmed booking, seats restored", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 4 });

    // Book a seat (instant mode, auto-confirms)
    const { data: bookingId } = await passenger1.client.rpc("book_ride_instant", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
      p_seats: 2,
    });

    // Verify seats decremented to 2
    const { data: rideBefore } = await admin.from("rides").select("seats_available").eq("id", rideId).single();
    expect(rideBefore!.seats_available).toBe(2);

    // Passenger cancels
    const { error } = await passenger1.client.rpc("cancel_booking", {
      p_booking_id: bookingId,
      p_user_id: passenger1.id,
      p_reason: "Changed plans",
    });

    expect(error).toBeNull();

    // Verify booking is cancelled
    const { data: booking } = await admin
      .from("bookings")
      .select("status, cancellation_reason")
      .eq("id", bookingId)
      .single();
    expect(booking!.status).toBe("cancelled");
    expect(booking!.cancellation_reason).toBe("Changed plans");

    // Verify seats restored to 4
    const { data: rideAfter } = await admin.from("rides").select("seats_available").eq("id", rideId).single();
    expect(rideAfter!.seats_available).toBe(4);
  });

  it("cancel pending booking does NOT restore seats", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 4, bookingMode: "request" });

    // Create pending booking (no seat decrement)
    const { data: bookingId } = await passenger1.client.rpc("request_ride_booking", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
    });

    // Verify seats still at 4
    const { data: rideBefore } = await admin.from("rides").select("seats_available").eq("id", rideId).single();
    expect(rideBefore!.seats_available).toBe(4);

    // Passenger cancels the pending booking
    const { error } = await passenger1.client.rpc("cancel_booking", {
      p_booking_id: bookingId,
      p_user_id: passenger1.id,
    });

    expect(error).toBeNull();

    // Verify booking is cancelled
    const { data: booking } = await admin.from("bookings").select("status").eq("id", bookingId).single();
    expect(booking!.status).toBe("cancelled");

    // Verify seats still at 4 (no restoration needed)
    const { data: rideAfter } = await admin.from("rides").select("seats_available").eq("id", rideId).single();
    expect(rideAfter!.seats_available).toBe(4);
  });
});
