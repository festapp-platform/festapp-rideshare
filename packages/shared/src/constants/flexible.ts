/**
 * Route intent (flexible ride) constants.
 *
 * Values match the database CHECK constraints exactly.
 */

export const ROUTE_INTENT_STATUS = {
  ACTIVE: 'active',
  CONFIRMED: 'confirmed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type RouteIntentStatus =
  (typeof ROUTE_INTENT_STATUS)[keyof typeof ROUTE_INTENT_STATUS];
