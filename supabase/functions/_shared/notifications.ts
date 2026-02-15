/**
 * Notification preference checking and type mapping.
 *
 * Maps each NotificationType to its corresponding push/email preference field.
 * Handles null preferences (no row = all defaults enabled -- Pitfall 7 from research).
 */

import { createAdminClient } from "./supabase-client.ts";

export type NotificationType =
  | "booking_request"
  | "booking_confirmation"
  | "booking_cancellation"
  | "new_message"
  | "ride_reminder"
  | "route_alert";

export interface NotificationPreferences {
  push_booking_requests: boolean;
  push_booking_confirmations: boolean;
  push_booking_cancellations: boolean;
  push_new_messages: boolean;
  push_ride_reminders: boolean;
  push_route_alerts: boolean;
  email_booking_confirmations: boolean;
  email_ride_reminders: boolean;
  email_cancellations: boolean;
}

/** Maps NotificationType to the push preference field name. */
const PUSH_PREF_MAP: Record<NotificationType, keyof NotificationPreferences> = {
  booking_request: "push_booking_requests",
  booking_confirmation: "push_booking_confirmations",
  booking_cancellation: "push_booking_cancellations",
  new_message: "push_new_messages",
  ride_reminder: "push_ride_reminders",
  route_alert: "push_route_alerts",
};

/**
 * Maps NotificationType to the email preference field name.
 * Some types have no email equivalent (booking_request, new_message, route_alert).
 */
const EMAIL_PREF_MAP: Partial<
  Record<NotificationType, keyof NotificationPreferences>
> = {
  booking_confirmation: "email_booking_confirmations",
  booking_cancellation: "email_cancellations",
  ride_reminder: "email_ride_reminders",
};

/**
 * Check if push notification should be sent for this type.
 * If prefs is null (no row exists), defaults to true (all enabled).
 */
export function shouldSendPush(
  prefs: NotificationPreferences | null,
  type: NotificationType,
): boolean {
  if (!prefs) return true; // Default: all enabled
  const field = PUSH_PREF_MAP[type];
  return field ? prefs[field] as boolean : true;
}

/**
 * Check if email notification should be sent for this type.
 * Returns false for types without email support.
 * If prefs is null (no row exists), defaults to true for supported types.
 */
export function shouldSendEmail(
  prefs: NotificationPreferences | null,
  type: NotificationType,
): boolean {
  const field = EMAIL_PREF_MAP[type];
  if (!field) return false; // Type has no email equivalent
  if (!prefs) return true; // Default: all enabled
  return prefs[field] as boolean;
}

/**
 * Fetch notification preferences for a user using admin client (bypasses RLS).
 * Returns null if no row exists (means all defaults = enabled).
 */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching notification preferences:", error);
    return null; // Treat errors as "all enabled" for graceful degradation
  }

  return data as NotificationPreferences | null;
}
