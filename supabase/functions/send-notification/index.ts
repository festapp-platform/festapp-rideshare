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
 * Email templates are generated inline for eligible types when ride_data
 * is provided and no explicit email_html is given.
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
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

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

interface RideData {
  ride_id?: string;
  origin_address: string;
  destination_address: string;
  departure_time?: string;
  other_party_name?: string;
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
  ride_data?: RideData;
}

const VALID_TYPES: NotificationType[] = [
  "booking_request",
  "booking_confirmation",
  "booking_cancellation",
  "new_message",
  "ride_reminder",
  "route_alert",
  "flexible_ride_confirmed",
];

/** Email-eligible notification types that can generate templates from ride_data. */
const EMAIL_TEMPLATE_TYPES: NotificationType[] = [
  "booking_confirmation",
  "booking_cancellation",
  "ride_reminder",
];

const APP_NAME = "FestApp Rideshare";
const APP_URL = Deno.env.get("APP_URL") ?? "https://rideshare.festapp.io";

// ---------------------------------------------------------------------------
// Email template generation
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDepartureTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function emailWrapper(content: string, rideId?: string): string {
  const viewRideUrl = rideId ? `${APP_URL}/rides/${rideId}` : APP_URL;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f3;padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr><td style="background:#6C63FF;padding:20px 24px;text-align:center;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">${APP_NAME}</span>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:24px;">
          ${content}
          <div style="margin-top:24px;text-align:center;">
            <a href="${escapeHtml(viewRideUrl)}" style="display:inline-block;padding:12px 28px;background:#6C63FF;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View Ride</a>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 24px;border-top:1px solid #eee;text-align:center;">
          <p style="margin:0;font-size:12px;color:#999;">Manage your notification preferences in <a href="${APP_URL}/settings/notifications" style="color:#6C63FF;">app settings</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function generateEmailContent(
  type: NotificationType,
  rideData: RideData,
): { subject: string; html: string } | null {
  const origin = escapeHtml(rideData.origin_address);
  const destination = escapeHtml(rideData.destination_address);
  const departure = rideData.departure_time
    ? formatDepartureTime(rideData.departure_time)
    : "";
  const otherParty = rideData.other_party_name
    ? escapeHtml(rideData.other_party_name)
    : "";

  switch (type) {
    case "booking_confirmation": {
      const subject = `Booking Confirmed - ${rideData.origin_address} to ${rideData.destination_address}`;
      const content = `
        <h2 style="margin:0 0 16px;color:#333;font-size:20px;">Booking Confirmed</h2>
        <p style="margin:0 0 12px;color:#555;font-size:14px;line-height:1.5;">Your booking has been confirmed${otherParty ? ` with <strong>${otherParty}</strong>` : ""}.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f7;border-radius:8px;padding:16px;margin:16px 0;">
          <tr><td style="padding:8px 16px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">From</p>
            <p style="margin:0;font-size:15px;color:#333;font-weight:500;">${origin}</p>
          </td></tr>
          <tr><td style="padding:8px 16px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">To</p>
            <p style="margin:0;font-size:15px;color:#333;font-weight:500;">${destination}</p>
          </td></tr>
          ${departure ? `<tr><td style="padding:8px 16px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">Departure</p>
            <p style="margin:0;font-size:15px;color:#333;font-weight:500;">${escapeHtml(departure)}</p>
          </td></tr>` : ""}
        </table>`;
      return { subject, html: emailWrapper(content, rideData.ride_id) };
    }

    case "ride_reminder": {
      const subject = `Ride Reminder - Departing in 1 hour`;
      const content = `
        <h2 style="margin:0 0 16px;color:#333;font-size:20px;">Ride Reminder</h2>
        <p style="margin:0 0 12px;color:#555;font-size:14px;line-height:1.5;">Your ride is departing soon. Make sure you are ready!</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f7;border-radius:8px;padding:16px;margin:16px 0;">
          <tr><td style="padding:8px 16px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">From</p>
            <p style="margin:0;font-size:15px;color:#333;font-weight:500;">${origin}</p>
          </td></tr>
          <tr><td style="padding:8px 16px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">To</p>
            <p style="margin:0;font-size:15px;color:#333;font-weight:500;">${destination}</p>
          </td></tr>
          ${departure ? `<tr><td style="padding:8px 16px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">Departure</p>
            <p style="margin:0;font-size:15px;color:#333;font-weight:500;">${escapeHtml(departure)}</p>
          </td></tr>` : ""}
        </table>`;
      return { subject, html: emailWrapper(content, rideData.ride_id) };
    }

    case "booking_cancellation": {
      const subject = `Booking Cancelled - ${rideData.origin_address} to ${rideData.destination_address}`;
      const content = `
        <h2 style="margin:0 0 16px;color:#333;font-size:20px;">Booking Cancelled</h2>
        <p style="margin:0 0 12px;color:#555;font-size:14px;line-height:1.5;">A booking for the following ride has been cancelled${otherParty ? ` by <strong>${otherParty}</strong>` : ""}.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f7;border-radius:8px;padding:16px;margin:16px 0;">
          <tr><td style="padding:8px 16px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">From</p>
            <p style="margin:0;font-size:15px;color:#333;font-weight:500;">${origin}</p>
          </td></tr>
          <tr><td style="padding:8px 16px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">To</p>
            <p style="margin:0;font-size:15px;color:#333;font-weight:500;">${destination}</p>
          </td></tr>
          ${departure ? `<tr><td style="padding:8px 16px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">Departure</p>
            <p style="margin:0;font-size:15px;color:#333;font-weight:500;">${escapeHtml(departure)}</p>
          </td></tr>` : ""}
        </table>`;
      return { subject, html: emailWrapper(content, rideData.ride_id) };
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Rate limit: 50 requests per 60 seconds (internal, high-volume)
  const { limited, retryAfter } = await checkRateLimit(req, "send-notification", {
    maxRequests: 50,
    windowSeconds: 60,
  });
  if (limited) return rateLimitResponse(retryAfter);

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

    const supabase = createAdminClient();
    let pushSent = false;
    let emailSent = false;

    // Extract ride_id / booking_id from data for logging
    const rideId = payload.data?.ride_id ?? payload.ride_data?.ride_id ?? null;
    const bookingId = payload.data?.booking_id ?? null;

    // Send push notification if enabled
    if (shouldSendPush(prefs, payload.type)) {
      pushSent = await sendPush({
        userIds: [payload.user_id],
        title: payload.title,
        body: payload.body,
        data: payload.data,
        url: payload.url,
      });

      // Log push notification
      await supabase.from("log_notifications").insert({
        user_id: payload.user_id,
        type: payload.type,
        channel: "push",
        status: pushSent ? "sent" : "failed",
        ride_id: rideId,
        booking_id: bookingId,
      });
    }

    // Determine email content: use provided html, or generate from template
    let emailSubject = payload.email_subject ?? payload.title;
    let emailHtml = payload.email_html ?? null;

    if (
      !emailHtml &&
      payload.ride_data &&
      EMAIL_TEMPLATE_TYPES.includes(payload.type)
    ) {
      const generated = generateEmailContent(payload.type, payload.ride_data);
      if (generated) {
        emailSubject = generated.subject;
        emailHtml = generated.html;
      }
    }

    // Send email if content available and enabled by preferences
    if (emailHtml && shouldSendEmail(prefs, payload.type)) {
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
          subject: emailSubject,
          html: emailHtml,
        });

        // Log email
        await supabase.from("log_emails").insert({
          user_id: payload.user_id,
          type: payload.type,
          recipient_email: userData.user.email,
          status: emailSent ? "sent" : "failed",
          ride_id: rideId,
          booking_id: bookingId,
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
