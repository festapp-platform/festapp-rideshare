"use server";

import { createClient } from "@/lib/supabase/server";

interface AiResponse {
  intent: {
    action: string;
    confidence: number;
    language: string;
    params: Record<string, unknown>;
    display_text: string;
    needs_confirmation: boolean;
  } | null;
  reply: string;
  error?: string;
}

interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Send a message to the AI assistant Edge Function.
 * Returns the parsed intent (if any) and conversational reply.
 */
export async function sendAiMessage(
  message: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<AiResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { intent: null, reply: "", error: "Not authenticated" };
  }

  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: {
      message,
      conversation_history: conversationHistory,
    },
  });

  if (error) {
    return {
      intent: null,
      reply: "",
      error: error.message || "Failed to reach AI assistant",
    };
  }

  return data as AiResponse;
}

/**
 * Execute a confirmed AI action (mutation or query).
 * Maps AI intent actions to Supabase RPCs and queries.
 */
export async function executeAiAction(
  action: string,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    switch (action) {
      case "create_ride": {
        // First compute route to get geometry
        let routeGeometry: string | null = null;
        let distanceMeters: number | null = null;
        let durationSeconds: number | null = null;

        if (params.origin_address && params.destination_address) {
          // Try to get route via compute-route Edge Function
          const { data: routeData } = await supabase.functions.invoke(
            "compute-route",
            {
              body: {
                originAddress: params.origin_address,
                destinationAddress: params.destination_address,
              },
            },
          );

          if (routeData?.route_geometry) {
            routeGeometry = routeData.route_geometry;
            distanceMeters = routeData.distance_meters ?? null;
            durationSeconds = routeData.duration_seconds ?? null;
          }
        }

        // Parse departure timestamp from date + time params
        const departureDate = params.departure_date as string | undefined;
        const departureTime = params.departure_time as string | undefined;
        let departureTimestamp: string | null = null;

        if (departureDate && departureTime) {
          departureTimestamp = new Date(
            `${departureDate}T${departureTime}`,
          ).toISOString();
        } else if (departureDate) {
          departureTimestamp = new Date(
            `${departureDate}T08:00`,
          ).toISOString();
        }

        const rideData: Record<string, unknown> = {
          driver_id: user.id,
          origin_address: params.origin_address,
          destination_address: params.destination_address,
          departure_time: departureTimestamp,
          seats_total: params.available_seats ?? 3,
          seats_available: params.available_seats ?? 3,
          price_czk: params.price_per_seat ?? null,
          notes: params.notes ?? null,
          ...(routeGeometry ? { route_geometry: routeGeometry } : {}),
          ...(distanceMeters
            ? { distance_meters: Math.round(distanceMeters) }
            : {}),
          ...(durationSeconds ? { duration_seconds: durationSeconds } : {}),
        };

        const { data: ride, error: rideError } = await supabase
          .from("rides")
          .insert(rideData)
          .select()
          .single();

        if (rideError) {
          return { success: false, error: rideError.message };
        }

        return { success: true, data: ride };
      }

      case "search_rides": {
        // Try text-based search using ilike on addresses
        const originQuery = (params.origin_address as string) ?? "";
        const destinationQuery = (params.destination_address as string) ?? "";

        let query = supabase
          .from("rides")
          .select(
            "id, origin_address, destination_address, departure_time, seats_available, price_czk, driver_id",
          )
          .eq("status", "upcoming")
          .gt("seats_available", 0)
          .order("departure_time", { ascending: true })
          .limit(10);

        if (originQuery) {
          query = query.ilike("origin_address", `%${originQuery}%`);
        }
        if (destinationQuery) {
          query = query.ilike("destination_address", `%${destinationQuery}%`);
        }

        const { data: rides, error: searchError } = await query;

        if (searchError) {
          return { success: false, error: searchError.message };
        }

        return { success: true, data: rides };
      }

      case "book_seat": {
        const { error: bookError } = await supabase.rpc("book_seat", {
          p_ride_id: params.ride_id as string,
          p_seats: (params.seats as number) ?? 1,
          p_passenger_id: user.id,
        });

        if (bookError) {
          return { success: false, error: bookError.message };
        }

        return { success: true };
      }

      case "cancel_booking": {
        const { error: cancelError } = await supabase.rpc("cancel_booking", {
          p_booking_id: params.booking_id as string,
          p_user_id: user.id,
          p_reason: (params.reason as string) ?? null,
        });

        if (cancelError) {
          return { success: false, error: cancelError.message };
        }

        return { success: true };
      }

      case "edit_ride": {
        const rideId = params.ride_id as string;
        const updates: Record<string, unknown> = {};

        if (params.departure_date || params.departure_time) {
          const date =
            (params.departure_date as string) ??
            new Date().toISOString().split("T")[0];
          const time = (params.departure_time as string) ?? "08:00";
          updates.departure_time = new Date(`${date}T${time}`).toISOString();
        }
        if (params.available_seats !== undefined) {
          updates.seats_total = params.available_seats;
          updates.seats_available = params.available_seats;
        }
        if (params.price_per_seat !== undefined) {
          updates.price_czk = params.price_per_seat;
        }
        if (params.notes !== undefined) {
          updates.notes = params.notes;
        }

        const { data: updated, error: editError } = await supabase
          .from("rides")
          .update(updates)
          .eq("id", rideId)
          .eq("driver_id", user.id)
          .select()
          .single();

        if (editError) {
          return { success: false, error: editError.message };
        }

        return { success: true, data: updated };
      }

      case "complete_ride": {
        const { error: completeError } = await supabase.rpc("complete_ride", {
          p_ride_id: params.ride_id as string,
          p_driver_id: user.id,
        });

        if (completeError) {
          return { success: false, error: completeError.message };
        }

        return { success: true };
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Action failed",
    };
  }
}
