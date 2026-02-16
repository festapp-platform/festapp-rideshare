import { createTestUser, type TestUser } from "../helpers/test-user";
import { cleanupUsers } from "../helpers/cleanup";

// Skip entire suite if AI API key is not configured
const AI_KEY_AVAILABLE = !!process.env.GOOGLE_AI_API_KEY;
const describeIfAI = AI_KEY_AVAILABLE ? describe : describe.skip;

/**
 * Helper: invoke the ai-assistant Edge Function with a message.
 */
async function invokeAI(user: TestUser, message: string) {
  const { data, error } = await user.client.functions.invoke("ai-assistant", {
    body: { message, conversation_history: [] },
  });
  return { data, error };
}

describeIfAI("ai-assistant edge function", () => {
  let user: TestUser;
  const userIds: string[] = [];

  beforeAll(async () => {
    user = await createTestUser("AI Test User");
    userIds.push(user.id);
  });

  afterAll(async () => {
    await cleanupUsers(userIds);
  });

  describe("ride creation intents (TEST-11)", () => {
    it("parses Czech ride creation input", { timeout: 20_000 }, async () => {
      const { data, error } = await invokeAI(
        user,
        "Chci nabidnout jizdu z Prahy do Brna zitra v 8:00",
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.intent).toBeDefined();
      expect(data.intent.action).toBe("create_ride");
      expect(typeof data.intent.params.origin_address).toBe("string");
      expect(data.intent.params.origin_address.length).toBeGreaterThan(0);
      expect(typeof data.intent.params.destination_address).toBe("string");
      expect(data.intent.params.destination_address.length).toBeGreaterThan(0);
      expect(data.intent.needs_confirmation).toBe(true);
    });

    it("parses Slovak ride creation input", { timeout: 20_000 }, async () => {
      const { data, error } = await invokeAI(
        user,
        "Chcem ponuknut jazdu z Bratislavy do Kosic v piatok o 15:00",
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.intent).toBeDefined();
      expect(data.intent.action).toBe("create_ride");
      expect(typeof data.intent.params.origin_address).toBe("string");
      expect(data.intent.params.origin_address.length).toBeGreaterThan(0);
      expect(typeof data.intent.params.destination_address).toBe("string");
      expect(data.intent.params.destination_address.length).toBeGreaterThan(0);
      expect(data.intent.needs_confirmation).toBe(true);
    });

    it("parses English ride creation input", { timeout: 20_000 }, async () => {
      const { data, error } = await invokeAI(
        user,
        "I want to offer a ride from Prague to Brno tomorrow at 8am",
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.intent).toBeDefined();
      expect(data.intent.action).toBe("create_ride");
      expect(typeof data.intent.params.origin_address).toBe("string");
      expect(data.intent.params.origin_address.length).toBeGreaterThan(0);
      expect(typeof data.intent.params.destination_address).toBe("string");
      expect(data.intent.params.destination_address.length).toBeGreaterThan(0);
      expect(data.intent.needs_confirmation).toBe(true);
    });
  });

  describe("error handling (TEST-12)", () => {
    it("handles incomplete input gracefully", { timeout: 20_000 }, async () => {
      const { data, error } = await invokeAI(user, "Jedu z Prahy");

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data.reply).toBe("string");
      expect(data.reply.length).toBeGreaterThan(0);
      expect(data.intent).toBeNull();
    });

    it("handles ambiguous input gracefully", { timeout: 20_000 }, async () => {
      const { data, error } = await invokeAI(user, "Chci jet");

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data.reply).toBe("string");
      expect(data.reply.length).toBeGreaterThan(0);
      expect(data.intent).toBeNull();
    });

    it("handles gibberish input without crashing", { timeout: 20_000 }, async () => {
      const { data, error } = await invokeAI(user, "asdfghjkl zxcvbnm");

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.reply).toBeDefined();
    });

    it("handles non-ride intent gracefully", { timeout: 20_000 }, async () => {
      const { data, error } = await invokeAI(
        user,
        "Jak funguje tato aplikace?",
      );

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(typeof data.reply).toBe("string");
      expect(data.reply.length).toBeGreaterThan(0);
      expect(data.intent).toBeNull();
    });
  });
});
