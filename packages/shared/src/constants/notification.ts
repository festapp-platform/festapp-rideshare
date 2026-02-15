export const NOTIFICATION_TYPES = {
  BOOKING_REQUEST: 'booking_request',
  BOOKING_CONFIRMATION: 'booking_confirmation',
  BOOKING_CANCELLATION: 'booking_cancellation',
  NEW_MESSAGE: 'new_message',
  RIDE_REMINDER: 'ride_reminder',
  ROUTE_ALERT: 'route_alert',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/**
 * Maps notification types to their corresponding preference field names.
 * Used by Edge Functions to check if a user has enabled notifications for a given type.
 */
export const NOTIFICATION_CATEGORIES: Record<
  NotificationType,
  { push: string; email?: string }
> = {
  booking_request: { push: 'push_booking_requests' },
  booking_confirmation: {
    push: 'push_booking_confirmations',
    email: 'email_booking_confirmations',
  },
  booking_cancellation: {
    push: 'push_booking_cancellations',
    email: 'email_cancellations',
  },
  new_message: { push: 'push_new_messages' },
  ride_reminder: {
    push: 'push_ride_reminders',
    email: 'email_ride_reminders',
  },
  route_alert: { push: 'push_route_alerts' },
};

export const MESSAGE_TYPE = {
  TEXT: 'text',
  PHONE_SHARE: 'phone_share',
} as const;

export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];
