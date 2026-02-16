import { createTestUser, type TestUser } from "../helpers/test-user.js";
import { createTestRide } from "../helpers/test-ride.js";
import { createAdminClient } from "../helpers/supabase-client.js";
import { cleanupUsers } from "../helpers/cleanup.js";

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

describe("book_ride_instant", () => {
  it("books a seat and decrements seats_available", async () => {
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

  it("rejects driver booking own ride", async () => {
    const rideId = await createTestRide({ driverId: driver.id });

    const { error } = await driver.client.rpc("book_ride_instant", {
      p_ride_id: rideId,
      p_passenger_id: driver.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Driver cannot book own ride");
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
});

describe("request_ride_booking -> respond_to_booking", () => {
  it("creates pending booking then driver accepts -> confirmed, seats decrement", async () => {
    const rideId = await createTestRide({ driverId: driver.id, seatsTotal: 4, bookingMode: "request" });

    // Passenger requests booking
    const { data: bookingId, error } = await passenger1.client.rpc("request_ride_booking", {
      p_ride_id: rideId,
      p_passenger_id: passenger1.id,
      p_seats: 2,
    });

    expect(error).toBeNull();
    expect(bookingId).toBeTruthy();

    // Verify seats NOT decremented yet
    const { data: rideBefore } = await admin.from("rides").select("seats_available").eq("id", rideId).single();
    expect(rideBefore!.seats_available).toBe(4);

    // Verify booking is pending
    const { data: bookingBefore } = await admin.from("bookings").select("status").eq("id", bookingId).single();
    expect(bookingBefore!.status).toBe("pending");

    // Driver accepts
    const { error: acceptError } = await driver.client.rpc("respond_to_booking", {
      p_booking_id: bookingId,
      p_driver_id: driver.id,
      p_accept: true,
    });
    expect(acceptError).toBeNull();

    // Verify booking is confirmed
    const { data: bookingAfter } = await admin.from("bookings").select("status").eq("id", bookingId).single();
    expect(bookingAfter!.status).toBe("confirmed");

    // Verify seats decremented
    const { data: rideAfter } = await admin.from("rides").select("seats_available").eq("id", rideId).single();
    expect(rideAfter!.seats_available).toBe(2);
  });
});

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
});
