/**
 * Review-related constants.
 *
 * Used across web and mobile apps for consistent review behavior.
 */

export const REVIEW_MAX_COMMENT_LENGTH = 500;
export const REVIEW_DEADLINE_DAYS = 14;
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const REVIEW_REMINDER_HOURS = [0, 24, 168] as const; // immediate, 24h, 7d
