/**
 * Moderation and trust-safety constants.
 *
 * Values match the database CHECK constraints exactly.
 * Used across web and mobile apps for consistent moderation behavior.
 */

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
} as const;
export type AccountStatus = (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];

export const MODERATION_ACTION_TYPE = {
  WARNING: 'warning',
  SUSPENSION: 'suspension',
  BAN: 'ban',
  UNBAN: 'unban',
  UNSUSPEND: 'unsuspend',
} as const;
export type ModerationActionType =
  (typeof MODERATION_ACTION_TYPE)[keyof typeof MODERATION_ACTION_TYPE];

export const REPORT_STATUS = {
  OPEN: 'open',
  REVIEWING: 'reviewing',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;
export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export const SUSPENSION_DURATIONS = [
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
] as const;

export const EXPERIENCED_BADGE_THRESHOLD = 10; // completed rides
