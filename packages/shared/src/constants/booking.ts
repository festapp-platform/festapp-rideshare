/**
 * Booking-related constants.
 *
 * Values match the database CHECK constraints exactly.
 * Used across web and mobile apps for consistent behavior.
 */

export const BOOKING_STATUS = {
  pending: 'pending',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
  completed: 'completed',
} as const;

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];
