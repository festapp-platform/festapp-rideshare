/**
 * Send Notification Edge Function.
 *
 * Central dispatch for all notification types. Checks user preferences
 * and dispatches to push (OneSignal) and/or email (AWS SES) channels.
 *
 * Authentication: service_role key required (server-to-server only).
 * All notification triggers (booking events, chat messages, ride reminders,
 * route alerts) call this single function.
 *
 * Returns:
 *   200 - Notification dispatched (with push_sent/email_sent booleans)
 *   400 - Invalid payload
 *   401 - Unauthorized (missing or invalid service_role key)
 *   500 - Server error
 */
import { createAdminClient } from "../_shared/supabase-client.ts";
import { sendPush } from "../_shared/onesignal.ts";
import { sendEmail } from "../_shared/ses.ts";
import {
  getNotificationPreferences,
  shouldSendEmail,
  shouldSendPush,
} from "../_shared/notifications.ts";
import type { NotificationType } from "../_shared/notifications.ts";

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

interface NotificationPayload {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  url?: string;
  email_subject?: string;
  email_html?: string;
}

const VALID_TYPES: NotificationType[] = [
  "booking_request",
  "booking_confirmation",
  "booking_cancellation",
  "new_message",
  "ride_reminder",
  "route_alert",
];

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

    // Parse and validate payload
    const payload: NotificationPayload = await req.json();

    if (!payload.user_id || !payload.type || !payload.title || !payload.body) {
      return jsonResponse(
        {
          error:
            "Invalid payload. Required: user_id, type, title, body",
        },
        400,
      );
    }

    if (!VALID_TYPES.includes(payload.type)) {
      return jsonResponse(
        {
          error: `Invalid notification type. Must be one of: ${VALID_TYPES.join(", ")}`,
        },
        400,
      );
    }

    // Fetch user preferences
    const prefs = await getNotificationPreferences(payload.user_id);

    let pushSent = false;
    let emailSent = false;

    // Send push notification if enabled
    if (shouldSendPush(prefs, payload.type)) {
      pushSent = await sendPush({
        userIds: [payload.user_id],
        title: payload.title,
        body: payload.body,
        data: payload.data,
        url: payload.url,
      });
    }

    // Send email if content provided and enabled
    if (payload.email_html && shouldSendEmail(prefs, payload.type)) {
      // Fetch user's email from auth.users via admin client
      const supabase = createAdminClient();
      const { data: userData, error: userError } =
        await supabase.auth.admin.getUserById(payload.user_id);

      if (userError || !userData?.user?.email) {
        console.warn(
          `Could not fetch email for user ${payload.user_id}:`,
          userError?.message ?? "no email",
        );
      } else {
        emailSent = await sendEmail({
          to: userData.user.email,
          subject: payload.email_subject ?? payload.title,
          html: payload.email_html,
        });
      }
    }

    return jsonResponse(
      { success: true, push_sent: pushSent, email_sent: emailSent },
      200,
    );
  } catch (error) {
    console.error("send-notification error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
