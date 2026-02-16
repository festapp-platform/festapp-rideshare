/**
 * MCP tool definitions and handlers for ride operations.
 *
 * Registers 8 tools for external AI assistants to interact with the
 * rideshare platform: create, search, book, cancel, edit, complete,
 * list rides, and list bookings.
 */
import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAuthenticatedClient } from "./auth.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function success(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function error(message: string): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerTools(server: McpServer): void {
  // -----------------------------------------------------------------------
  // 1. create_ride
  // -----------------------------------------------------------------------
  server.registerTool("create_ride", {
    description: "Create a new ride offering.",
    inputSchema: {
      origin_address: z.string().describe("Origin/pickup address"),
      destination_address: z.string().describe("Destination address"),
      departure_date: z.string().describe("Departure date in ISO format (YYYY-MM-DD)"),
      departure_time: z.string().describe("Departure time in HH:MM format"),
      available_seats: z.number().int().min(1).max(8).describe("Number of available seats (1-8)"),
      price_per_seat: z.number().min(0).optional().describe("Price per seat (optional)"),
      notes: z.string().optional().describe("Additional notes (optional)"),
    },
  }, async (args) => {
    try {
      const supabase = getAuthenticatedClient();

      const departureAt = new Date(`${args.departure_date}T${args.departure_time}:00`);

      const rideData: Record<string, unknown> = {
        origin_address: args.origin_address,
        destination_address: args.destination_address,
        departure_at: departureAt.toISOString(),
        available_seats: args.available_seats,
        status: "upcoming",
      };

      if (args.price_per_seat !== undefined) {
        rideData.price_per_seat = args.price_per_seat;
      }
      if (args.notes !== undefined) {
        rideData.notes = args.notes;
      }

      const { data, error: dbError } = await supabase
        .from("rides")
        .insert(rideData)
        .select()
        .single();

      if (dbError) return error(`Failed to create ride: ${dbError.message}`);
      return success({ message: "Ride created successfully", ride: data });
    } catch (e) {
      return error(`Error creating ride: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  // -----------------------------------------------------------------------
  // 2. search_rides
  // -----------------------------------------------------------------------
  server.registerTool("search_rides", {
    description: "Search for available rides near a route.",
    inputSchema: {
      origin_address: z.string().describe("Origin/pickup address to search near"),
      destination_address: z.string().describe("Destination address to search near"),
      date: z.string().optional().describe("Filter by date (ISO YYYY-MM-DD, optional)"),
      radius_km: z.number().min(1).max(100).default(10).describe("Search radius in km (default 10)"),
    },
  }, async (args) => {
    try {
      const supabase = getAuthenticatedClient();

      // Attempt geocoding via compute-route Edge Function
      let useGeospatial = false;
      let originLat: number | undefined;
      let originLng: number | undefined;
      let destLat: number | undefined;
      let destLng: number | undefined;

      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceKey) {
        try {
          const routeRes = await fetch(`${supabaseUrl}/functions/v1/compute-route`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              origin: args.origin_address,
              destination: args.destination_address,
            }),
          });

          if (routeRes.ok) {
            const routeData = await routeRes.json();
            if (routeData.origin_lat && routeData.origin_lng && routeData.dest_lat && routeData.dest_lng) {
              originLat = routeData.origin_lat;
              originLng = routeData.origin_lng;
              destLat = routeData.dest_lat;
              destLng = routeData.dest_lng;
              useGeospatial = true;
            }
          }
        } catch {
          // Geocoding failed, fall back to text search
        }
      }

      if (useGeospatial && originLat && originLng && destLat && destLng) {
        const rpcParams: Record<string, unknown> = {
          p_origin_lat: originLat,
          p_origin_lng: originLng,
          p_dest_lat: destLat,
          p_dest_lng: destLng,
          p_radius_m: args.radius_km * 1000,
        };

        if (args.date) {
          rpcParams.p_date = args.date;
        }

        const { data, error: dbError } = await supabase.rpc("nearby_rides", rpcParams);

        if (dbError) return error(`Geospatial search failed: ${dbError.message}`);
        return success({ rides: data, count: Array.isArray(data) ? data.length : 0, search_type: "geospatial" });
      }

      // Fallback: text-based search
      let query = supabase
        .from("rides")
        .select("*")
        .ilike("origin_address", `%${args.origin_address}%`)
        .ilike("destination_address", `%${args.destination_address}%`)
        .eq("status", "upcoming")
        .order("departure_at", { ascending: true });

      if (args.date) {
        query = query.gte("departure_at", `${args.date}T00:00:00`)
          .lte("departure_at", `${args.date}T23:59:59`);
      }

      const { data, error: dbError } = await query;

      if (dbError) return error(`Search failed: ${dbError.message}`);
      return success({ rides: data, count: Array.isArray(data) ? data.length : 0, search_type: "text" });
    } catch (e) {
      return error(`Error searching rides: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  // -----------------------------------------------------------------------
  // 3. book_seat
  // -----------------------------------------------------------------------
  server.registerTool("book_seat", {
    description: "Book seat(s) on a ride.",
    inputSchema: {
      ride_id: z.string().uuid().describe("UUID of the ride to book"),
      seats: z.number().int().min(1).max(4).default(1).describe("Number of seats to book (1-4, default 1)"),
    },
  }, async (args) => {
    try {
      const supabase = getAuthenticatedClient();

      const { data, error: dbError } = await supabase.rpc("book_seat", {
        p_ride_id: args.ride_id,
        p_seats: args.seats,
      });

      if (dbError) return error(`Failed to book seat: ${dbError.message}`);
      return success({ message: "Seat booked successfully", booking: data });
    } catch (e) {
      return error(`Error booking seat: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  // -----------------------------------------------------------------------
  // 4. cancel_booking
  // -----------------------------------------------------------------------
  server.registerTool("cancel_booking", {
    description: "Cancel an existing booking.",
    inputSchema: {
      booking_id: z.string().uuid().describe("UUID of the booking to cancel"),
      reason: z.string().optional().describe("Cancellation reason (optional)"),
    },
  }, async (args) => {
    try {
      const supabase = getAuthenticatedClient();

      const rpcParams: Record<string, unknown> = {
        p_booking_id: args.booking_id,
      };
      if (args.reason !== undefined) {
        rpcParams.p_reason = args.reason;
      }

      const { data, error: dbError } = await supabase.rpc("cancel_booking", rpcParams);

      if (dbError) return error(`Failed to cancel booking: ${dbError.message}`);
      return success({ message: "Booking cancelled successfully", result: data });
    } catch (e) {
      return error(`Error cancelling booking: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  // -----------------------------------------------------------------------
  // 5. edit_ride
  // -----------------------------------------------------------------------
  server.registerTool("edit_ride", {
    description: "Edit an existing ride.",
    inputSchema: {
      ride_id: z.string().uuid().describe("UUID of the ride to edit"),
      origin_address: z.string().optional().describe("New origin address"),
      destination_address: z.string().optional().describe("New destination address"),
      departure_date: z.string().optional().describe("New departure date (ISO YYYY-MM-DD)"),
      departure_time: z.string().optional().describe("New departure time (HH:MM)"),
      available_seats: z.number().int().min(1).max(8).optional().describe("New number of available seats"),
      price_per_seat: z.number().min(0).optional().describe("New price per seat"),
      notes: z.string().optional().describe("New notes"),
    },
  }, async (args) => {
    try {
      const supabase = getAuthenticatedClient();

      const updates: Record<string, unknown> = {};

      if (args.origin_address !== undefined) updates.origin_address = args.origin_address;
      if (args.destination_address !== undefined) updates.destination_address = args.destination_address;
      if (args.available_seats !== undefined) updates.available_seats = args.available_seats;
      if (args.price_per_seat !== undefined) updates.price_per_seat = args.price_per_seat;
      if (args.notes !== undefined) updates.notes = args.notes;

      if (args.departure_date && args.departure_time) {
        updates.departure_at = new Date(`${args.departure_date}T${args.departure_time}:00`).toISOString();
      } else if (args.departure_date) {
        // Fetch existing ride to preserve time
        const { data: existing } = await supabase
          .from("rides")
          .select("departure_at")
          .eq("id", args.ride_id)
          .single();
        if (existing?.departure_at) {
          const existingTime = new Date(existing.departure_at).toISOString().split("T")[1];
          updates.departure_at = `${args.departure_date}T${existingTime}`;
        }
      } else if (args.departure_time) {
        const { data: existing } = await supabase
          .from("rides")
          .select("departure_at")
          .eq("id", args.ride_id)
          .single();
        if (existing?.departure_at) {
          const existingDate = new Date(existing.departure_at).toISOString().split("T")[0];
          updates.departure_at = new Date(`${existingDate}T${args.departure_time}:00`).toISOString();
        }
      }

      if (Object.keys(updates).length === 0) {
        return error("No fields to update. Provide at least one field to change.");
      }

      const { data, error: dbError } = await supabase
        .from("rides")
        .update(updates)
        .eq("id", args.ride_id)
        .select()
        .single();

      if (dbError) return error(`Failed to edit ride: ${dbError.message}`);
      return success({ message: "Ride updated successfully", ride: data });
    } catch (e) {
      return error(`Error editing ride: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  // -----------------------------------------------------------------------
  // 6. complete_ride
  // -----------------------------------------------------------------------
  server.registerTool("complete_ride", {
    description: "Mark a ride as completed.",
    inputSchema: {
      ride_id: z.string().uuid().describe("UUID of the ride to complete"),
    },
  }, async (args) => {
    try {
      const supabase = getAuthenticatedClient();

      const { data, error: dbError } = await supabase.rpc("complete_ride", {
        p_ride_id: args.ride_id,
      });

      if (dbError) return error(`Failed to complete ride: ${dbError.message}`);
      return success({ message: "Ride marked as completed", result: data });
    } catch (e) {
      return error(`Error completing ride: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  // -----------------------------------------------------------------------
  // 7. my_rides
  // -----------------------------------------------------------------------
  server.registerTool("my_rides", {
    description: "List your rides as driver or passenger.",
    inputSchema: {
      status: z.enum(["upcoming", "past"]).optional().describe("Filter by status: upcoming or past"),
    },
  }, async (args) => {
    try {
      const supabase = getAuthenticatedClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return error("Not authenticated. Provide SUPABASE_USER_JWT.");

      const now = new Date().toISOString();

      // Rides as driver
      let driverQuery = supabase
        .from("rides")
        .select("*, bookings(id, passenger_id, seats, status)")
        .eq("driver_id", user.id)
        .order("departure_at", { ascending: true });

      if (args.status === "upcoming") {
        driverQuery = driverQuery.gte("departure_at", now).in("status", ["upcoming", "in_progress"]);
      } else if (args.status === "past") {
        driverQuery = driverQuery.or(`departure_at.lt.${now},status.eq.completed,status.eq.cancelled`);
      }

      const { data: driverRides, error: driverError } = await driverQuery;
      if (driverError) return error(`Failed to fetch driver rides: ${driverError.message}`);

      // Rides as passenger (via bookings)
      let passengerQuery = supabase
        .from("bookings")
        .select("*, ride:rides(*)")
        .eq("passenger_id", user.id)
        .order("created_at", { ascending: false });

      if (args.status === "upcoming") {
        passengerQuery = passengerQuery.in("status", ["confirmed", "pending"]);
      } else if (args.status === "past") {
        passengerQuery = passengerQuery.in("status", ["completed", "cancelled"]);
      }

      const { data: passengerBookings, error: passengerError } = await passengerQuery;
      if (passengerError) return error(`Failed to fetch passenger rides: ${passengerError.message}`);

      return success({
        as_driver: driverRides ?? [],
        as_passenger: passengerBookings ?? [],
        driver_count: driverRides?.length ?? 0,
        passenger_count: passengerBookings?.length ?? 0,
      });
    } catch (e) {
      return error(`Error fetching rides: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  // -----------------------------------------------------------------------
  // 8. my_bookings
  // -----------------------------------------------------------------------
  server.registerTool("my_bookings", {
    description: "List your bookings.",
    inputSchema: {
      status: z.enum(["upcoming", "past"]).optional().describe("Filter by status: upcoming or past"),
    },
  }, async (args) => {
    try {
      const supabase = getAuthenticatedClient();

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return error("Not authenticated. Provide SUPABASE_USER_JWT.");

      let query = supabase
        .from("bookings")
        .select("*, ride:rides(id, origin_address, destination_address, departure_at, status, driver_id)")
        .eq("passenger_id", user.id)
        .order("created_at", { ascending: false });

      if (args.status === "upcoming") {
        query = query.in("status", ["confirmed", "pending"]);
      } else if (args.status === "past") {
        query = query.in("status", ["completed", "cancelled"]);
      }

      const { data, error: dbError } = await query;

      if (dbError) return error(`Failed to fetch bookings: ${dbError.message}`);
      return success({ bookings: data ?? [], count: data?.length ?? 0 });
    } catch (e) {
      return error(`Error fetching bookings: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}
