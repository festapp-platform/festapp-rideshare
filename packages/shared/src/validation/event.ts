import { z } from 'zod';
import {
  EVENT_NAME_MIN,
  EVENT_NAME_MAX,
  EVENT_DESCRIPTION_MAX,
} from '../constants/event';

/**
 * Event creation and update validation schemas.
 *
 * Location is split into address + lat/lng for form handling.
 * The API layer converts lat/lng to PostGIS GEOGRAPHY on insert.
 */

export const CreateEventSchema = z.object({
  name: z.string().min(EVENT_NAME_MIN).max(EVENT_NAME_MAX),
  description: z.string().max(EVENT_DESCRIPTION_MAX).optional(),
  location_address: z.string().min(1).max(500),
  location_lat: z.number().min(-90).max(90),
  location_lng: z.number().min(-180).max(180),
  event_date: z.string().datetime(),
  event_end_date: z.string().datetime().optional(),
});

export const UpdateEventSchema = CreateEventSchema.partial();

// Inferred types
export type CreateEvent = z.infer<typeof CreateEventSchema>;
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;
