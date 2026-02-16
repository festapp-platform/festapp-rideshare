import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for MCP tool registration and input validation.
 *
 * Uses a mock McpServer that captures registerTool calls to verify
 * tool definitions without needing a real MCP transport.
 */

// Mock auth module to avoid env var requirements
vi.mock("../auth.js", () => ({
  getAuthenticatedClient: vi.fn(() => {
    throw new Error("Not configured for tests");
  }),
}));

interface RegisteredToolEntry {
  name: string;
  config: {
    description?: string;
    inputSchema?: Record<string, unknown>;
  };
  callback: (...args: unknown[]) => unknown;
}

// Create a mock McpServer that records registerTool calls
function createMockServer() {
  const tools: RegisteredToolEntry[] = [];

  const mockServer = {
    registerTool: vi.fn(
      (name: string, config: RegisteredToolEntry["config"], callback: RegisteredToolEntry["callback"]) => {
        tools.push({ name, config, callback });
        return { update: vi.fn(), remove: vi.fn(), disable: vi.fn(), enable: vi.fn() };
      },
    ),
    server: {
      setRequestHandler: vi.fn(),
    },
  };

  return { mockServer, tools };
}

describe("registerTools", () => {
  let tools: RegisteredToolEntry[];
  let mockServer: ReturnType<typeof createMockServer>["mockServer"];

  beforeEach(async () => {
    const mock = createMockServer();
    mockServer = mock.mockServer;
    tools = mock.tools;

    // Dynamic import to ensure mocks are in place
    const { registerTools } = await import("../tools.js");
    registerTools(mockServer as never);
  });

  it("registers exactly 8 tools", () => {
    expect(tools).toHaveLength(8);
  });

  it("registers all expected tool names", () => {
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("create_ride");
    expect(toolNames).toContain("search_rides");
    expect(toolNames).toContain("book_seat");
    expect(toolNames).toContain("cancel_booking");
    expect(toolNames).toContain("edit_ride");
    expect(toolNames).toContain("complete_ride");
    expect(toolNames).toContain("my_rides");
    expect(toolNames).toContain("my_bookings");
  });

  it("every tool has a description", () => {
    for (const tool of tools) {
      expect(tool.config.description).toBeDefined();
      expect(typeof tool.config.description).toBe("string");
      expect(tool.config.description!.length).toBeGreaterThan(0);
    }
  });

  it("every tool has an inputSchema", () => {
    for (const tool of tools) {
      expect(tool.config.inputSchema).toBeDefined();
    }
  });

  it("every tool has a callback function", () => {
    for (const tool of tools) {
      expect(typeof tool.callback).toBe("function");
    }
  });

  describe("create_ride input schema", () => {
    it("has required fields: origin_address, destination_address, departure_date, departure_time", () => {
      const createRide = tools.find((t) => t.name === "create_ride");
      expect(createRide).toBeDefined();
      const schema = createRide!.config.inputSchema!;
      expect(schema).toHaveProperty("origin_address");
      expect(schema).toHaveProperty("destination_address");
      expect(schema).toHaveProperty("departure_date");
      expect(schema).toHaveProperty("departure_time");
    });

    it("has optional fields: price_per_seat, notes", () => {
      const createRide = tools.find((t) => t.name === "create_ride");
      const schema = createRide!.config.inputSchema!;
      expect(schema).toHaveProperty("price_per_seat");
      expect(schema).toHaveProperty("notes");
    });
  });

  describe("search_rides input schema", () => {
    it("has required fields: origin_address, destination_address", () => {
      const searchRides = tools.find((t) => t.name === "search_rides");
      expect(searchRides).toBeDefined();
      const schema = searchRides!.config.inputSchema!;
      expect(schema).toHaveProperty("origin_address");
      expect(schema).toHaveProperty("destination_address");
    });

    it("has optional fields: date, radius_km", () => {
      const searchRides = tools.find((t) => t.name === "search_rides");
      const schema = searchRides!.config.inputSchema!;
      expect(schema).toHaveProperty("date");
      expect(schema).toHaveProperty("radius_km");
    });
  });

  describe("book_seat input schema", () => {
    it("has required field: ride_id", () => {
      const bookSeat = tools.find((t) => t.name === "book_seat");
      expect(bookSeat).toBeDefined();
      const schema = bookSeat!.config.inputSchema!;
      expect(schema).toHaveProperty("ride_id");
    });
  });

  describe("cancel_booking input schema", () => {
    it("has required field: booking_id", () => {
      const cancelBooking = tools.find((t) => t.name === "cancel_booking");
      expect(cancelBooking).toBeDefined();
      const schema = cancelBooking!.config.inputSchema!;
      expect(schema).toHaveProperty("booking_id");
    });
  });

  describe("edit_ride input schema", () => {
    it("has required field: ride_id", () => {
      const editRide = tools.find((t) => t.name === "edit_ride");
      expect(editRide).toBeDefined();
      const schema = editRide!.config.inputSchema!;
      expect(schema).toHaveProperty("ride_id");
    });
  });

  describe("complete_ride input schema", () => {
    it("has required field: ride_id", () => {
      const completeRide = tools.find((t) => t.name === "complete_ride");
      expect(completeRide).toBeDefined();
      const schema = completeRide!.config.inputSchema!;
      expect(schema).toHaveProperty("ride_id");
    });
  });
});

describe("tool handler error cases", () => {
  it("tool callbacks return error when auth is not configured", async () => {
    const mock = createMockServer();
    const { registerTools } = await import("../tools.js");
    registerTools(mock.mockServer as never);

    // All tools that call getAuthenticatedClient should return error
    const createRide = mock.tools.find((t) => t.name === "create_ride");
    expect(createRide).toBeDefined();

    const result = (await createRide!.callback({
      origin_address: "Praha",
      destination_address: "Brno",
      departure_date: "2026-03-01",
      departure_time: "08:00",
      available_seats: 3,
    })) as { content: Array<{ type: string; text: string }>; isError?: boolean };

    // Should return an error response (not throw) since handler catches errors
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    expect(result.isError).toBe(true);
  });
});
