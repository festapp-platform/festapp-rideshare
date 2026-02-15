/**
 * Event-related constants.
 *
 * Values match the database CHECK constraints exactly.
 * Used across web and mobile apps for consistent behavior.
 */

export const EVENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

/** Minimum event name length */
export const EVENT_NAME_MIN = 3;

/** Maximum event name length */
export const EVENT_NAME_MAX = 200;

/** Maximum event description length */
export const EVENT_DESCRIPTION_MAX = 2000;
