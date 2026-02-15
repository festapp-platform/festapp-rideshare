import { z } from 'zod';

export const NotificationPreferencesSchema = z.object({
  push_booking_requests: z.boolean().default(true),
  push_booking_confirmations: z.boolean().default(true),
  push_booking_cancellations: z.boolean().default(true),
  push_new_messages: z.boolean().default(true),
  push_ride_reminders: z.boolean().default(true),
  push_route_alerts: z.boolean().default(true),
  email_booking_confirmations: z.boolean().default(true),
  email_ride_reminders: z.boolean().default(true),
  email_cancellations: z.boolean().default(true),
});

export type NotificationPreferences = z.infer<
  typeof NotificationPreferencesSchema
>;
