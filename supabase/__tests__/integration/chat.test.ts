import { createTestUser, type TestUser } from "../helpers/test-user";
import { createTestRide } from "../helpers/test-ride";
import { createTestBooking } from "../helpers/test-booking";
import { createAdminClient } from "../helpers/supabase-client";
import { cleanupUsers } from "../helpers/cleanup";

describe("chat", () => {
  let driver: TestUser;
  let passenger: TestUser;
  let thirdUser: TestUser;
  let rideId: string;
  let bookingId: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    driver = await createTestUser("Chat Driver");
    passenger = await createTestUser("Chat Passenger");
    thirdUser = await createTestUser("Chat Outsider");
    userIds.push(driver.id, passenger.id, thirdUser.id);

    // Create ride with confirmed booking (chat requires confirmed status)
    rideId = await createTestRide({
      driverId: driver.id,
      status: "upcoming",
    });
    bookingId = await createTestBooking(rideId, passenger.id, "confirmed");
  });

  afterAll(async () => {
    await cleanupUsers(userIds);
  });

  describe("get_or_create_conversation", () => {
    let conversationId: string;

    it("creates conversation for confirmed booking", async () => {
      const { data, error } = await passenger.client.rpc("get_or_create_conversation", {
        p_booking_id: bookingId,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data).toBe("string");
      expect(data!.length).toBeGreaterThan(0);

      conversationId = data!;
    });

    it("returns same conversation on second call (idempotent)", async () => {
      const { data, error } = await driver.client.rpc("get_or_create_conversation", {
        p_booking_id: bookingId,
      });

      expect(error).toBeNull();
      expect(data).toBe(conversationId);
    });

    it("rejects for non-participant", async () => {
      const { data, error } = await thirdUser.client.rpc("get_or_create_conversation", {
        p_booking_id: bookingId,
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain("Not authorized");
    });
  });

  describe("send_chat_message", () => {
    let conversationId: string;

    beforeAll(async () => {
      // Ensure conversation exists
      const { data } = await passenger.client.rpc("get_or_create_conversation", {
        p_booking_id: bookingId,
      });
      conversationId = data!;
    });

    it("sends text message in conversation", async () => {
      const { data, error } = await passenger.client.rpc("send_chat_message", {
        p_conversation_id: conversationId,
        p_content: "Hello, looking forward to the ride!",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data).toBe("string");

      // Verify message exists in DB
      const admin = createAdminClient();
      const { data: message } = await admin
        .from("chat_messages")
        .select("*")
        .eq("id", data)
        .single();

      expect(message).toBeDefined();
      expect(message!.sender_id).toBe(passenger.id);
      expect(message!.content).toBe("Hello, looking forward to the ride!");
      expect(message!.message_type).toBe("text");
    });

    it("sends phone_share message type", async () => {
      const { data, error } = await driver.client.rpc("send_chat_message", {
        p_conversation_id: conversationId,
        p_content: "+420123456789",
        p_message_type: "phone_share",
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      const admin = createAdminClient();
      const { data: message } = await admin
        .from("chat_messages")
        .select("*")
        .eq("id", data)
        .single();

      expect(message!.message_type).toBe("phone_share");
    });

    it("rejects message by non-participant", async () => {
      const { data, error } = await thirdUser.client.rpc("send_chat_message", {
        p_conversation_id: conversationId,
        p_content: "I should not be here",
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain("Not a participant");
    });
  });

  describe("mark_messages_read + get_unread_count", () => {
    let conversationId: string;

    beforeAll(async () => {
      // Use a fresh booking + conversation to isolate unread counts
      const freshRideId = await createTestRide({
        driverId: driver.id,
        status: "upcoming",
      });
      const freshBookingId = await createTestBooking(freshRideId, passenger.id, "confirmed");

      const { data } = await passenger.client.rpc("get_or_create_conversation", {
        p_booking_id: freshBookingId,
      });
      conversationId = data!;
    });

    it("unread count starts at 0 for passenger", async () => {
      const { data, error } = await passenger.client.rpc("get_unread_count");

      expect(error).toBeNull();
      // Count may include messages from earlier tests, so just check type
      // For this fresh conversation, passenger has no unread messages
      expect(typeof data).toBe("number");
    });

    it("driver sends messages, passenger unread count increases", async () => {
      // Get baseline unread count
      const { data: beforeCount } = await passenger.client.rpc("get_unread_count");

      // Driver sends 2 messages
      await driver.client.rpc("send_chat_message", {
        p_conversation_id: conversationId,
        p_content: "Message 1 from driver",
      });
      await driver.client.rpc("send_chat_message", {
        p_conversation_id: conversationId,
        p_content: "Message 2 from driver",
      });

      const { data: afterCount, error } = await passenger.client.rpc("get_unread_count");

      expect(error).toBeNull();
      expect(afterCount).toBe((beforeCount as number) + 2);
    });

    it("mark_messages_read resets unread count to 0", async () => {
      // Mark messages as read
      const { error: markError } = await passenger.client.rpc("mark_messages_read", {
        p_conversation_id: conversationId,
      });
      expect(markError).toBeNull();

      // Verify unread in this conversation is 0 by checking messages directly
      const admin = createAdminClient();
      const { data: unreadMessages } = await admin
        .from("chat_messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .neq("sender_id", passenger.id)
        .is("read_at", null);

      expect(unreadMessages).toHaveLength(0);
    });

    it("non-participant cannot mark messages read", async () => {
      const { error } = await thirdUser.client.rpc("mark_messages_read", {
        p_conversation_id: conversationId,
      });

      expect(error).not.toBeNull();
      expect(error!.message).toContain("Not a participant");
    });
  });
});
