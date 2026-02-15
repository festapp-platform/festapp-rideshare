import { z } from 'zod';

export const BookSeatSchema = z.object({
  rideId: z.string().uuid(),
  seats: z.number().int().min(1).max(8),
});

export const CancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export type BookSeat = z.infer<typeof BookSeatSchema>;
export type CancelBooking = z.infer<typeof CancelBookingSchema>;
