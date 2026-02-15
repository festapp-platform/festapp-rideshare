/**
 * Check Route Alerts Edge Function.
 *
 * Called via pg_net trigger when a new ride is inserted.
 * Checks all favorite_routes with alert_enabled=true for geospatial matches
 * and sends push notifications to matching users.
 *
 * Authentication: service_role key required (called from database trigger).
 *
 * Payload: { ride_id: string }
 * Returns: { alerts_sent: number }
 */
import { createAdminClient } from "../_shared/supabase-client.ts";
import { sendPush } from "../_shared/onesignal.ts";
import {
  getNotificationPreferences,
  shouldSendPush,
} from "../_shared/notifications.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Authenticate: only service_role callers allowed
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (
      !authHeader ||
      !serviceRoleKey ||
      authHeader !== `Bearer ${serviceRoleKey}`
    ) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Parse payload
    const { ride_id } = await req.json();
    if (!ride_id) {
      return jsonResponse({ error: "Missing ride_id" }, 400);
    }

    const supabase = createAdminClient();

    // Fetch the new ride details
    const { data: ride, error: rideError } = await supabase
      .from("rides")
      .select(
        "id, driver_id, origin_address, destination_address, origin_location, destination_location, departure_time",
      )
      .eq("id", ride_id)
      .single();

    if (rideError || !ride) {
      console.error("Failed to fetch ride:", rideError?.message);
      return jsonResponse({ error: "Ride not found" }, 404);
    }

    // Find matching alert-enabled favorite routes using ST_DWithin (20km radius).
    // Excludes the driver's own routes.
    const { data: matches, error: matchError } = await supabase.rpc(
      "find_matching_route_alerts",
      {
        p_ride_id: ride.id,
        p_driver_id: ride.driver_id,
      },
    );

    if (matchError) {
      console.error("Route alert matching error:", matchError.message);
      return jsonResponse({ error: "Matching failed" }, 500);
    }

    if (!matches || matches.length === 0) {
      return jsonResponse({ alerts_sent: 0 }, 200);
    }

    // Format departure date for notification body
    const departureDate = new Date(ride.departure_time).toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const originShort = ride.origin_address.split(",")[0];
    const destShort = ride.destination_address.split(",")[0];

    // Send push notification to each matching user (respecting preferences)
    let alertsSent = 0;

    for (const match of matches as { user_id: string }[]) {
      const prefs = await getNotificationPreferences(match.user_id);

      if (shouldSendPush(prefs, "route_alert")) {
        const sent = await sendPush({
          userIds: [match.user_id],
          title: "New ride on your route!",
          body: `${originShort} to ${destShort} on ${departureDate}`,
          data: { ride_id: ride.id },
          url: `/rides/${ride.id}`,
        });

        if (sent) {
          alertsSent++;
        }
      }
    }

    return jsonResponse({ alerts_sent: alertsSent }, 200);
  } catch (error) {
    console.error("check-route-alerts error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
