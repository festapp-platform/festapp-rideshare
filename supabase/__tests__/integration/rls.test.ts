import { createTestUser, type TestUser } from "../helpers/test-user";
import { createTestRide, COORDS } from "../helpers/test-ride";
import { createTestBooking } from "../helpers/test-booking";
import { createAdminClient } from "../helpers/supabase-client";
import { cleanupUsers } from "../helpers/cleanup";

const admin = createAdminClient();

let userA: TestUser; // driver
let userB: TestUser; // passenger
let userC: TestUser; // uninvolved

beforeAll(async () => {
  userA = await createTestUser("RLS Driver A");
  userB = await createTestUser("RLS Passenger B");
  userC = await createTestUser("RLS Uninvolved C");
});

afterAll(async () => {
  await cleanupUsers([userA.id, userB.id, userC.id]);
});

// ============================================================
// profiles RLS
// ============================================================
describe("profiles RLS", () => {
  it("any authenticated user can read any profile", async () => {
    const { data, error } = await userB.client
      .from("profiles")
      .select("id, display_name")
      .eq("id", userA.id)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe(userA.id);
  });

  it("user can only update own profile", async () => {
    // userB tries to update userA's display_name — should affect 0 rows
    const { data: updateOther, error: errorOther } = await userB.client
      .from("profiles")
      .update({ display_name: "Hacked Name" })
      .eq("id", userA.id)
      .select();

    expect(errorOther).toBeNull();
    expect(updateOther).toHaveLength(0);

    // userA updates own profile — should succeed
    const { data: updateOwn, error: errorOwn } = await userA.client
      .from("profiles")
      .update({ display_name: "Updated Driver A" })
      .eq("id", userA.id)
      .select();

    expect(errorOwn).toBeNull();
    expect(updateOwn).toHaveLength(1);
    expect(updateOwn![0].display_name).toBe("Updated Driver A");
  });
});

// ============================================================
// rides RLS
// ============================================================
describe("rides RLS", () => {
  let rideId: string;

  beforeAll(async () => {
    rideId = await createTestRide({ driverId: userA.id });
  });

  it("any authenticated user can read all rides", async () => {
    const { data, error } = await userB.client
      .from("rides")
      .select("id")
      .eq("id", rideId)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe(rideId);
  });

  it("driver can only update own rides", async () => {
    // userB tries to update userA's ride — 0 rows affected
    const { data: updateOther, error: errorOther } = await userB.client
      .from("rides")
      .update({ price_czk: 999 })
      .eq("id", rideId)
      .select();

    expect(errorOther).toBeNull();
    expect(updateOther).toHaveLength(0);

    // userA updates own ride — success
    const { data: updateOwn, error: errorOwn } = await userA.client
      .from("rides")
      .update({ price_czk: 300 })
      .eq("id", rideId)
      .select();

    expect(errorOwn).toBeNull();
    expect(updateOwn).toHaveLength(1);
    expect(updateOwn![0].price_czk).toBe(300);
  });
});

// ============================================================
// bookings RLS
// ============================================================
describe("bookings RLS", () => {
  it("booking visible to passenger and driver only", async () => {
    const rideId = await createTestRide({ driverId: userA.id });
    const bookingId = await createTestBooking(rideId, userB.id, "confirmed");

    // userB (passenger) can see their booking
    const { data: bBookings, error: bError } = await userB.client
      .from("bookings")
      .select("id")
      .eq("id", bookingId);

    expect(bError).toBeNull();
    expect(bBookings).toHaveLength(1);

    // userA (driver) can see booking on their ride
    const { data: aBookings, error: aError } = await userA.client
      .from("bookings")
      .select("id")
      .eq("id", bookingId);

    expect(aError).toBeNull();
    expect(aBookings).toHaveLength(1);

    // userC (uninvolved) cannot see the booking
    const { data: cBookings, error: cError } = await userC.client
      .from("bookings")
      .select("id")
      .eq("id", bookingId);

    expect(cError).toBeNull();
    expect(cBookings).toHaveLength(0);
  });
});

// ============================================================
// chat RLS
// ============================================================
describe("chat RLS", () => {
  it("chat messages visible to conversation participants only", async () => {
    // Setup: create ride, booking, conversation, and messages
    const rideId = await createTestRide({ driverId: userA.id });
    const bookingId = await createTestBooking(rideId, userB.id, "confirmed");

    // userB creates conversation (passenger initiates)
    const { data: convId, error: convError } = await userB.client.rpc(
      "get_or_create_conversation",
      { p_booking_id: bookingId },
    );
    expect(convError).toBeNull();
    expect(convId).toBeTruthy();

    // userA sends a message in the conversation
    const { data: msgId, error: msgError } = await userA.client.rpc(
      "send_chat_message",
      {
        p_conversation_id: convId,
        p_content: "Hello from driver!",
      },
    );
    expect(msgError).toBeNull();
    expect(msgId).toBeTruthy();

    // userC queries chat_messages — should see nothing
    const { data: cMessages, error: cError } = await userC.client
      .from("chat_messages")
      .select("id")
      .eq("conversation_id", convId);

    expect(cError).toBeNull();
    expect(cMessages).toHaveLength(0);

    // Verify participants CAN see messages
    const { data: aMessages } = await userA.client
      .from("chat_messages")
      .select("id")
      .eq("conversation_id", convId);
    expect(aMessages).toHaveLength(1);

    const { data: bMessages } = await userB.client
      .from("chat_messages")
      .select("id")
      .eq("conversation_id", convId);
    expect(bMessages).toHaveLength(1);
  });
});

// ============================================================
// reviews RLS
// ============================================================
describe("reviews RLS", () => {
  let completedBookingId: string;
  let completedRideId: string;

  beforeAll(async () => {
    // Create a completed ride + booking for review tests
    completedRideId = await createTestRide({ driverId: userA.id });
    completedBookingId = await createTestBooking(
      completedRideId,
      userB.id,
      "confirmed",
    );

    // Complete the ride so reviews can be submitted
    const { error } = await userA.client.rpc("complete_ride", {
      p_ride_id: completedRideId,
      p_driver_id: userA.id,
    });
    expect(error).toBeNull();
  });

  it("unrevealed review visible only to reviewer", async () => {
    // userB submits a review (only one side, so it stays unrevealed)
    const { data: result, error } = await userB.client.rpc("submit_review", {
      p_booking_id: completedBookingId,
      p_rating: 4,
      p_comment: "Good ride",
    });
    expect(error).toBeNull();
    expect(result).toBeTruthy();

    const reviewId = (result as any).review_id;

    // userB can see their own unrevealed review
    const { data: bReviews } = await userB.client
      .from("reviews")
      .select("id")
      .eq("id", reviewId);
    expect(bReviews).toHaveLength(1);

    // userA cannot see the unrevealed review (not the reviewer, not revealed)
    const { data: aReviews } = await userA.client
      .from("reviews")
      .select("id")
      .eq("id", reviewId);
    expect(aReviews).toHaveLength(0);
  });

  it("revealed reviews visible to all authenticated users", async () => {
    // userA submits a review too — triggers dual-reveal
    const { data: result, error } = await userA.client.rpc("submit_review", {
      p_booking_id: completedBookingId,
      p_rating: 5,
      p_comment: "Great passenger",
    });
    expect(error).toBeNull();
    expect((result as any).both_reviewed).toBe(true);

    // userC (uninvolved) queries reviews for this booking — should see both (revealed)
    const { data: cReviews, error: cError } = await userC.client
      .from("reviews")
      .select("id, revealed_at")
      .eq("booking_id", completedBookingId);

    expect(cError).toBeNull();
    expect(cReviews).toHaveLength(2);
    // Both should have revealed_at set
    for (const review of cReviews!) {
      expect(review.revealed_at).not.toBeNull();
    }
  });
});

// ============================================================
// reports RLS
// ============================================================
describe("reports RLS", () => {
  it("reporter sees own reports, reported user does not", async () => {
    // userA reports userB
    const { data: reportId, error } = await userA.client.rpc("report_user", {
      p_reported_user_id: userB.id,
      p_description: "This is a test report with sufficient length for validation",
    });
    expect(error).toBeNull();
    expect(reportId).toBeTruthy();

    // userA can see the report
    const { data: aReports, error: aError } = await userA.client
      .from("reports")
      .select("id")
      .eq("id", reportId);

    expect(aError).toBeNull();
    expect(aReports).toHaveLength(1);

    // userB cannot see the report (they are reported, not the reporter)
    const { data: bReports, error: bError } = await userB.client
      .from("reports")
      .select("id")
      .eq("id", reportId);

    expect(bError).toBeNull();
    expect(bReports).toHaveLength(0);
  });
});

// ============================================================
// user_blocks RLS
// ============================================================
describe("user_blocks RLS", () => {
  it("user can only see own blocks", async () => {
    // userA blocks userB
    const { error: blockError } = await userA.client.rpc("block_user", {
      p_blocked_id: userB.id,
    });
    expect(blockError).toBeNull();

    // userA can see the block
    const { data: aBlocks, error: aError } = await userA.client
      .from("user_blocks")
      .select("id, blocker_id, blocked_id")
      .eq("blocked_id", userB.id);

    expect(aError).toBeNull();
    expect(aBlocks).toHaveLength(1);
    expect(aBlocks![0].blocker_id).toBe(userA.id);

    // userB cannot see the block (not the blocker)
    const { data: bBlocks, error: bError } = await userB.client
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", userA.id);

    expect(bError).toBeNull();
    expect(bBlocks).toHaveLength(0);

    // Cleanup: unblock for other tests
    await userA.client.rpc("unblock_user", { p_blocked_id: userB.id });
  });
});
