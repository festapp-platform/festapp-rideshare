import { z } from 'zod';
import { LocationSchema } from './ride';

/**
 * Search parameters validation schema.
 *
 * Used by both web and mobile search forms.
 * radiusKm defaults to 15km (matches SEARCH_RADIUS_DEFAULT_KM constant).
 */

export const SearchRidesSchema = z.object({
  origin: LocationSchema,
  destination: LocationSchema,
  date: z.string().date(),
  radiusKm: z.number().min(1).max(100).default(15),
});

// Inferred type
export type SearchRides = z.infer<typeof SearchRidesSchema>;
