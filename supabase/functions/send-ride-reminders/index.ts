/**
 * Send Ride Reminders Edge Function.
 *
 * Cron-triggered (every 15 minutes via pg_cron). Finds rides departing
 * within ~75 minutes that haven't been reminded yet, and sends push
 * notifications to driver and confirmed passengers.
 *
 * Authentication: service_role key required (server-to-server only).
 *
 * Returns:
 *   200 - Reminders processed (with count)
 *   401 - Unauthorized
 *   500 - Server error
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

    const supabase = createAdminClient();
    let remindersSent = 0;

    // Find rides departing within 75 minutes that haven't been reminded
    const { data: rides, error: ridesError } = await supabase
      .from("rides")
      .select("id, driver_id, origin_address, destination_address")
      .eq("status", "upcoming")
      .is("reminder_sent_at", null)
      .gte("departure_time", new Date().toISOString())
      .lte(
        "departure_time",
        new Date(Date.now() + 75 * 60 * 1000).toISOString(),
      );

    if (ridesError) {
      console.error("Error fetching rides for reminders:", ridesError);
      return jsonResponse({ error: ridesError.message }, 500);
    }

    if (!rides || rides.length === 0) {
      return jsonResponse({ success: true, reminders_sent: 0 }, 200);
    }

    for (const ride of rides) {
      // Collect all users to notify: driver + confirmed passengers
      const userIds: string[] = [ride.driver_id];

      const { data: bookings } = await supabase
        .from("bookings")
        .select("passenger_id")
        .eq("ride_id", ride.id)
        .eq("status", "confirmed");

      if (bookings) {
        for (const booking of bookings) {
          userIds.push(booking.passenger_id);
        }
      }

      // Send push to each user who has ride_reminder enabled
      for (const userId of userIds) {
        const prefs = await getNotificationPreferences(userId);
        if (shouldSendPush(prefs, "ride_reminder")) {
          await sendPush({
            userIds: [userId],
            title: "Ride Reminder",
            body: `Your ride from ${ride.origin_address} to ${ride.destination_address} departs in about 1 hour`,
            data: { ride_id: ride.id },
          });
          remindersSent++;
        }
      }

      // Mark ride as reminded
      await supabase
        .from("rides")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", ride.id);
    }

    return jsonResponse(
      { success: true, reminders_sent: remindersSent },
      200,
    );
  } catch (error) {
    console.error("send-ride-reminders error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
