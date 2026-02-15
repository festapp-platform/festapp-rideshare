/** Broadcast channel name pattern for live location. Use: `live-location-${rideId}` */
export const LOCATION_CHANNEL_PREFIX = 'live-location-';

/** Broadcast event name for location updates */
export const LOCATION_BROADCAST_EVENT = 'location_update';

/** Broadcast event name for location sharing stopped */
export const LOCATION_STOPPED_EVENT = 'location_stopped';

/** Location update payload type */
export interface LocationPayload {
  lat: number;
  lng: number;
  accuracy: number;    // meters
  heading: number | null;
  speed: number | null; // m/s
  timestamp: number;   // Unix ms
}

/** GPS accuracy thresholds */
export const GPS_CONFIG = {
  /** High accuracy threshold - below this we use lower frequency (meters) */
  HIGH_ACCURACY_DISTANCE: 500,
  /** Update interval when far from pickup (ms) */
  FAR_INTERVAL_MS: 10000,
  /** Update interval when near pickup (ms) */
  NEAR_INTERVAL_MS: 3000,
  /** Distance filter - minimum movement before update (meters) */
  DISTANCE_FILTER_FAR: 50,
  /** Distance filter near pickup (meters) */
  DISTANCE_FILTER_NEAR: 10,
  /** Maximum age of cached position (ms) */
  MAX_AGE_MS: 5000,
  /** Position timeout (ms) */
  TIMEOUT_MS: 15000,
} as const;
