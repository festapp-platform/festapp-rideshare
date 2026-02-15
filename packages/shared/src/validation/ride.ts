import { z } from 'zod';

/**
 * Ride posting and editing validation schemas.
 *
 * LocationSchema is reused across ride creation, update, and search flows.
 * Enums match the database CHECK constraints exactly.
 */

export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(1).max(500),
  placeId: z.string().optional(),
});

export const CreateRideSchema = z.object({
  origin: LocationSchema,
  destination: LocationSchema,
  departureTime: z.string().datetime(),
  seatsTotal: z.number().int().min(1).max(8),
  priceCzk: z.number().min(0).max(5000).optional(),
  bookingMode: z.enum(['instant', 'request']),
  preferences: z
    .object({
      smoking: z.boolean(),
      pets: z.boolean(),
      music: z.boolean(),
      chat: z.boolean(),
    })
    .optional(),
  notes: z.string().max(500).optional(),
  vehicleId: z.string().uuid().optional(),
});

export const UpdateRideSchema = CreateRideSchema.partial().extend({
  id: z.string().uuid(),
});

// Inferred types
export type Location = z.infer<typeof LocationSchema>;
export type CreateRide = z.infer<typeof CreateRideSchema>;
export type UpdateRide = z.infer<typeof UpdateRideSchema>;
