import { createTestUser, deleteTestUser, type TestUser } from "../helpers/test-user";
import { createTestRide, COORDS } from "../helpers/test-ride";
import { createTestBooking } from "../helpers/test-booking";
import { createAdminClient } from "../helpers/supabase-client";
import { cleanupUsers } from "../helpers/cleanup";

describe("reviews", () => {
  let driver: TestUser;
  let passenger: TestUser;
  let rideId: string;
  let completedBookingId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    driver = await createTestUser("Review Driver");
    passenger = await createTestUser("Review Passenger");
    userIds.push(driver.id, passenger.id);

    // Create a completed ride + completed booking
    rideId = await createTestRide({
      driverId: driver.id,
      status: "completed",
    });
    completedBookingId = await createTestBooking(rideId, passenger.id, "completed");
  });

  afterAll(async () => {
    await cleanupUsers(userIds);
  });

  describe("submit_review", () => {
    it("passenger submits review for completed booking — review created, revealed_at IS NULL", async () => {
      const { data, error } = await passenger.client.rpc("submit_review", {
        p_booking_id: completedBookingId,
        p_rating: 4,
        p_comment: "Great ride!",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.review_id).toBeDefined();
      expect(data.both_reviewed).toBe(false);

      // Verify review exists with revealed_at IS NULL
      const admin = createAdminClient();
      const { data: review } = await admin
        .from("reviews")
        .select("*")
        .eq("id", data.review_id)
        .single();

      expect(review).toBeDefined();
      expect(review!.rating).toBe(4);
      expect(review!.comment).toBe("Great ride!");
      expect(review!.reviewer_id).toBe(passenger.id);
      expect(review!.reviewee_id).toBe(driver.id);
      expect(review!.revealed_at).toBeNull();
    });

    it("dual-reveal: both parties submit — both reviews get revealed_at set", async () => {
      // Passenger already reviewed in previous test; now driver reviews
      const { data, error } = await driver.client.rpc("submit_review", {
        p_booking_id: completedBookingId,
        p_rating: 5,
        p_comment: "Friendly passenger",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.both_reviewed).toBe(true);

      // Both reviews should now have revealed_at set
      const admin = createAdminClient();
      const { data: reviews } = await admin
        .from("reviews")
        .select("*")
        .eq("booking_id", completedBookingId)
        .order("created_at");

      expect(reviews).toHaveLength(2);
      expect(reviews![0].revealed_at).not.toBeNull();
      expect(reviews![1].revealed_at).not.toBeNull();
    });

    it("rating_avg and rating_count updated on profiles after reveal", async () => {
      const admin = createAdminClient();

      // Driver was reviewed by passenger with rating 4
      const { data: driverProfile } = await admin
        .from("profiles")
        .select("rating_avg, rating_count")
        .eq("id", driver.id)
        .single();

      expect(driverProfile!.rating_count).toBeGreaterThanOrEqual(1);
      expect(Number(driverProfile!.rating_avg)).toBeGreaterThan(0);

      // Passenger was reviewed by driver with rating 5
      const { data: passengerProfile } = await admin
        .from("profiles")
        .select("rating_avg, rating_count")
        .eq("id", passenger.id)
        .single();

      expect(passengerProfile!.rating_count).toBeGreaterThanOrEqual(1);
      expect(Number(passengerProfile!.rating_avg)).toBeGreaterThan(0);
    });

    it("rejects review on non-completed booking", async () => {
      // Create a confirmed (not completed) booking
      const confirmedRideId = await createTestRide({
        driverId: driver.id,
        status: "upcoming",
      });
      const confirmedBookingId = await createTestBooking(
        confirmedRideId,
        passenger.id,
        "confirmed",
      );

      const { data, error } = await passenger.client.rpc("submit_review", {
        p_booking_id: confirmedBookingId,
        p_rating: 3,
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain("Can only review completed rides");
    });

    it("rejects review by non-participant", async () => {
      const thirdUser = await createTestUser("Third User Reviews");
      userIds.push(thirdUser.id);

      const { data, error } = await thirdUser.client.rpc("submit_review", {
        p_booking_id: completedBookingId,
        p_rating: 3,
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain("Not a participant");
    });

    it("rejects duplicate review", async () => {
      // Passenger already reviewed completedBookingId in the first test
      const { data, error } = await passenger.client.rpc("submit_review", {
        p_booking_id: completedBookingId,
        p_rating: 2,
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain("already reviewed");
    });

    it("rejects review outside 14-day window", async () => {
      // Create a fresh completed booking then backdate updated_at
      const oldRideId = await createTestRide({
        driverId: driver.id,
        status: "completed",
      });
      const oldBookingId = await createTestBooking(oldRideId, passenger.id, "completed");

      const admin = createAdminClient();
      await admin
        .from("bookings")
        .update({ updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() })
        .eq("id", oldBookingId);

      const { data, error } = await passenger.client.rpc("submit_review", {
        p_booking_id: oldBookingId,
        p_rating: 4,
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain("Review window has expired");
    });

    it("rejects invalid rating (rating=0)", async () => {
      const freshRideId = await createTestRide({
        driverId: driver.id,
        status: "completed",
      });
      const freshBookingId = await createTestBooking(freshRideId, passenger.id, "completed");

      const { data, error } = await passenger.client.rpc("submit_review", {
        p_booking_id: freshBookingId,
        p_rating: 0,
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain("Rating must be between 1 and 5");
    });

    it("rejects invalid rating (rating=6)", async () => {
      const freshRideId = await createTestRide({
        driverId: driver.id,
        status: "completed",
      });
      const freshBookingId = await createTestBooking(freshRideId, passenger.id, "completed");

      const { data, error } = await passenger.client.rpc("submit_review", {
        p_booking_id: freshBookingId,
        p_rating: 6,
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain("Rating must be between 1 and 5");
    });

    it("rejects comment over 500 characters", async () => {
      const freshRideId = await createTestRide({
        driverId: driver.id,
        status: "completed",
      });
      const freshBookingId = await createTestBooking(freshRideId, passenger.id, "completed");

      const longComment = "a".repeat(501);
      const { data, error } = await passenger.client.rpc("submit_review", {
        p_booking_id: freshBookingId,
        p_rating: 4,
        p_comment: longComment,
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain("500 characters");
    });
  });

  describe("review RLS", () => {
    let rlsRideId: string;
    let rlsBookingId: string;
    let rlsReviewId: string;

    beforeAll(async () => {
      // Create a fresh completed ride+booking; only passenger reviews (unrevealed)
      rlsRideId = await createTestRide({
        driverId: driver.id,
        status: "completed",
      });
      rlsBookingId = await createTestBooking(rlsRideId, passenger.id, "completed");

      const { data } = await passenger.client.rpc("submit_review", {
        p_booking_id: rlsBookingId,
        p_rating: 3,
        p_comment: "RLS test review",
      });
      rlsReviewId = data.review_id;
    });

    it("unrevealed review visible only to reviewer", async () => {
      // Passenger (reviewer) can see it
      const { data: passengerView } = await passenger.client
        .from("reviews")
        .select("*")
        .eq("id", rlsReviewId);

      expect(passengerView).toHaveLength(1);

      // Driver (reviewee) cannot see unrevealed review
      const { data: driverView } = await driver.client
        .from("reviews")
        .select("*")
        .eq("id", rlsReviewId);

      expect(driverView).toHaveLength(0);
    });

    it("revealed reviews visible to both parties", async () => {
      // Driver submits counter-review to trigger dual-reveal
      await driver.client.rpc("submit_review", {
        p_booking_id: rlsBookingId,
        p_rating: 4,
        p_comment: "RLS counter review",
      });

      // Both parties should now see the passenger's review
      const { data: passengerView } = await passenger.client
        .from("reviews")
        .select("*")
        .eq("id", rlsReviewId);

      expect(passengerView).toHaveLength(1);
      expect(passengerView![0].revealed_at).not.toBeNull();

      const { data: driverView } = await driver.client
        .from("reviews")
        .select("*")
        .eq("id", rlsReviewId);

      expect(driverView).toHaveLength(1);
      expect(driverView![0].revealed_at).not.toBeNull();
    });
  });

  describe("completed_rides_count", () => {
    it("count increments when ride is completed via complete_ride RPC", async () => {
      const admin = createAdminClient();

      // Read current counts
      const { data: driverBefore } = await admin
        .from("profiles")
        .select("completed_rides_count")
        .eq("id", driver.id)
        .single();
      const { data: passengerBefore } = await admin
        .from("profiles")
        .select("completed_rides_count")
        .eq("id", passenger.id)
        .single();

      // Create a fresh upcoming ride with a confirmed booking
      const freshRideId = await createTestRide({
        driverId: driver.id,
        status: "upcoming",
      });
      const freshBookingId = await createTestBooking(freshRideId, passenger.id, "confirmed");

      // Complete the ride via RPC
      const { error } = await admin.rpc("complete_ride", {
        p_ride_id: freshRideId,
        p_driver_id: driver.id,
      });
      expect(error).toBeNull();

      // Check counts incremented
      const { data: driverAfter } = await admin
        .from("profiles")
        .select("completed_rides_count")
        .eq("id", driver.id)
        .single();
      const { data: passengerAfter } = await admin
        .from("profiles")
        .select("completed_rides_count")
        .eq("id", passenger.id)
        .single();

      expect(driverAfter!.completed_rides_count).toBe(
        driverBefore!.completed_rides_count + 1,
      );
      expect(passengerAfter!.completed_rides_count).toBe(
        passengerBefore!.completed_rides_count + 1,
      );
    });
  });
});
