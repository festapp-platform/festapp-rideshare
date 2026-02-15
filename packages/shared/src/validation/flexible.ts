import { z } from 'zod';

/**
 * Validation schemas for flexible rides (route intents).
 */

export const CreateRouteIntentSchema = z.object({
  origin_address: z.string().min(1).max(500),
  origin_lat: z.number().min(-90).max(90),
  origin_lng: z.number().min(-180).max(180),
  destination_address: z.string().min(1).max(500),
  destination_lat: z.number().min(-90).max(90),
  destination_lng: z.number().min(-180).max(180),
  seats_total: z.number().int().min(1).max(8),
  price_czk: z.number().min(0).max(5000).optional(),
  booking_mode: z.enum(['instant', 'request']),
  notes: z.string().max(500).optional(),
  vehicle_id: z.string().uuid().optional(),
});

export const ConfirmRouteIntentSchema = z.object({
  departure_time: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date > new Date();
    },
    { message: 'Departure time must be a valid future date' },
  ),
  seats_total: z.number().int().min(1).max(8).optional(),
  price_czk: z.number().min(0).max(5000).optional(),
});

// Inferred types
export type CreateRouteIntent = z.infer<typeof CreateRouteIntentSchema>;
export type ConfirmRouteIntent = z.infer<typeof ConfirmRouteIntentSchema>;
