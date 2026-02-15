/**
 * Send Ride Reminders Edge Function.
 *
 * Cron-triggered (every 15 minutes via pg_cron). Finds rides departing
 * within ~75 minutes that haven't been reminded yet, and dispatches
 * notifications (push + email) via the send-notification function.
 *
 * Authentication: service_role key required (server-to-server only).
 *
 * Returns:
 *   200 - Reminders processed (with count)
 *   401 - Unauthorized
 *   500 - Server error
 */
import { createAdminClient } from "../_shared/supabase-client.ts";

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

/**
 * Call send-notification Edge Function for a single user.
 * This centralizes push + email dispatch logic in one place.
 */
async function callSendNotification(payload: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const res = await fetch(
    `${supabaseUrl}/functions/v1/send-notification`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.warn("send-notification call failed:", res.status, text);
  }
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
      .select("id, driver_id, origin_address, destination_address, departure_time")
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

      // Dispatch via send-notification for each user (handles push + email + prefs)
      for (const userId of userIds) {
        await callSendNotification({
          user_id: userId,
          type: "ride_reminder",
          title: "Ride Reminder",
          body: `Your ride from ${ride.origin_address} to ${ride.destination_address} departs in about 1 hour`,
          data: { ride_id: ride.id },
          ride_data: {
            ride_id: ride.id,
            origin_address: ride.origin_address,
            destination_address: ride.destination_address,
            departure_time: ride.departure_time,
          },
        });
        remindersSent++;
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
