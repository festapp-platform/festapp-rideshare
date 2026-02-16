/**
 * AI tool definitions for ride operations.
 *
 * Each tool maps to a ride action. Gemini uses function calling to parse
 * natural language into structured function calls with typed parameters.
 *
 * Tool names match AI_ACTIONS keys from @festapp/shared.
 */

/**
 * System prompt for the rideshare AI assistant.
 *
 * Instructs the model to:
 * - Act as a Czech/Slovak rideshare assistant
 * - Detect user language and respond in the same language
 * - Use function calling for actionable intents
 * - Handle relative dates and Czech date expressions
 */
export const SYSTEM_PROMPT = `You are a helpful rideshare assistant for a Czech/Slovak carpooling app called spolujizda.online. You help users create rides, search for rides, book seats, cancel bookings, edit rides, and complete rides.

LANGUAGE RULES:
- Detect the user's language from their message (Czech, Slovak, or English).
- ALWAYS respond in the SAME language the user used.
- Handle Czech date expressions: "zitra" / "zítra" = tomorrow, "pozitri" / "pozítří" = day after tomorrow, "v pátek" = on Friday, "příští týden" = next week, "dnes" = today.
- Handle Slovak date expressions: "zajtra" = tomorrow, "pozajtra" = day after tomorrow, "v piatok" = on Friday, "budúci týždeň" = next week, "dnes" = today.
- Handle Czech/Slovak city names and common abbreviations (e.g., "Praha" = Prague, "Brno", "Ostrava", "Bratislava", "BA" = Bratislava, "KE" = Košice).

BEHAVIOR RULES:
- When you detect an actionable intent (creating a ride, searching, booking, cancelling, editing, completing), ALWAYS use the appropriate tool call.
- When the user is just chatting, asking questions about the app, or making conversation that doesn't map to a ride action, respond conversationally WITHOUT a tool call.
- For date/time parameters, convert relative expressions to ISO format dates (YYYY-MM-DD) and 24-hour time (HH:MM).
- Today's date will be provided in context. Use it to resolve relative dates.
- If the user provides incomplete information for an action, ask for the missing required fields.
- Be concise and friendly.

TODAY'S DATE: {today}`;

/**
 * AI tool definitions (Anthropic tool_use format, converted to Gemini at runtime).
 * Each tool corresponds to a ride operation.
 */
export const AI_TOOL_DEFINITIONS = [
  {
    name: "create_ride",
    description:
      "Create a new ride offering. Use when the user wants to offer a ride as a driver, share a car journey, or drive somewhere and take passengers. Required: origin, destination, date, and time.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin_address: {
          type: "string",
          description: "Starting location / pickup address",
        },
        destination_address: {
          type: "string",
          description: "Destination address / drop-off location",
        },
        departure_date: {
          type: "string",
          description: "Departure date in ISO format (YYYY-MM-DD)",
        },
        departure_time: {
          type: "string",
          description: "Departure time in 24-hour format (HH:MM)",
        },
        available_seats: {
          type: "integer",
          description: "Number of available seats (1-8)",
          minimum: 1,
          maximum: 8,
        },
        price_per_seat: {
          type: "number",
          description: "Price per seat in CZK (optional)",
        },
        notes: {
          type: "string",
          description: "Additional notes about the ride (optional)",
        },
      },
      required: [
        "origin_address",
        "destination_address",
        "departure_date",
        "departure_time",
      ],
    },
  },
  {
    name: "search_rides",
    description:
      "Search for available rides. Use when the user wants to find a ride, look for transport, or needs to get somewhere as a passenger.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin_address: {
          type: "string",
          description: "Starting location to search from",
        },
        destination_address: {
          type: "string",
          description: "Destination to search for",
        },
        date: {
          type: "string",
          description: "Date to search for rides (YYYY-MM-DD, optional)",
        },
        max_results: {
          type: "integer",
          description: "Maximum number of results to return (default 5)",
          default: 5,
        },
      },
      required: ["origin_address", "destination_address"],
    },
  },
  {
    name: "book_seat",
    description:
      "Book a seat on an existing ride. Use when the user wants to reserve, book, or join a specific ride they found.",
    input_schema: {
      type: "object" as const,
      properties: {
        ride_id: {
          type: "string",
          description: "UUID of the ride to book",
        },
        seats: {
          type: "integer",
          description: "Number of seats to book (1-4, default 1)",
          minimum: 1,
          maximum: 4,
          default: 1,
        },
      },
      required: ["ride_id"],
    },
  },
  {
    name: "cancel_booking",
    description:
      "Cancel an existing booking. Use when the user wants to cancel their reservation or withdraw from a ride.",
    input_schema: {
      type: "object" as const,
      properties: {
        booking_id: {
          type: "string",
          description: "UUID of the booking to cancel",
        },
        reason: {
          type: "string",
          description: "Reason for cancellation (optional)",
        },
      },
      required: ["booking_id"],
    },
  },
  {
    name: "edit_ride",
    description:
      "Edit an existing ride. Use when the driver wants to change ride details like time, seats, price, or notes.",
    input_schema: {
      type: "object" as const,
      properties: {
        ride_id: {
          type: "string",
          description: "UUID of the ride to edit",
        },
        origin_address: {
          type: "string",
          description: "New starting location (optional)",
        },
        destination_address: {
          type: "string",
          description: "New destination (optional)",
        },
        departure_date: {
          type: "string",
          description: "New departure date in ISO format (optional)",
        },
        departure_time: {
          type: "string",
          description: "New departure time in HH:MM format (optional)",
        },
        available_seats: {
          type: "integer",
          description: "New number of available seats (optional)",
          minimum: 1,
          maximum: 8,
        },
        price_per_seat: {
          type: "number",
          description: "New price per seat in CZK (optional)",
        },
        notes: {
          type: "string",
          description: "New notes (optional)",
        },
      },
      required: ["ride_id"],
    },
  },
  {
    name: "complete_ride",
    description:
      "Mark a ride as completed. Use when the driver confirms the ride has finished or arrived at the destination.",
    input_schema: {
      type: "object" as const,
      properties: {
        ride_id: {
          type: "string",
          description: "UUID of the ride to mark as completed",
        },
      },
      required: ["ride_id"],
    },
  },
];
