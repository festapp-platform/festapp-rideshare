/**
 * Ride-related constants.
 *
 * Values match the database CHECK constraints exactly.
 * Used across web and mobile apps for consistent behavior.
 */

export const RIDE_STATUS = {
  upcoming: 'upcoming',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;

export const BOOKING_MODE = {
  instant: 'instant',
  request: 'request',
} as const;

export const LUGGAGE_SIZE = {
  none: 'none',
  small: 'small',
  medium: 'medium',
  large: 'large',
} as const;

/** Maximum seats per ride */
export const MAX_SEATS = 8;

/** Minimum seats per ride */
export const MIN_SEATS = 1;

/** Default search radius in kilometers */
export const SEARCH_RADIUS_DEFAULT_KM = 15;

/** Maximum search radius in kilometers */
export const SEARCH_RADIUS_MAX_KM = 100;
