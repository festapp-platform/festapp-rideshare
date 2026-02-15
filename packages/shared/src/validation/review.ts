import { z } from 'zod';
import {
  REVIEW_MAX_COMMENT_LENGTH,
  RATING_MIN,
  RATING_MAX,
} from '../constants/review';

// --- User-facing schemas ---

export const SubmitReviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(RATING_MIN).max(RATING_MAX),
  comment: z
    .string()
    .max(REVIEW_MAX_COMMENT_LENGTH)
    .optional()
    .nullable(),
});
export type SubmitReview = z.infer<typeof SubmitReviewSchema>;

export const ReportUserSchema = z.object({
  reported_user_id: z.string().uuid(),
  description: z.string().min(10).max(2000),
  ride_id: z.string().uuid().optional().nullable(),
  booking_id: z.string().uuid().optional().nullable(),
  review_id: z.string().uuid().optional().nullable(),
});
export type ReportUser = z.infer<typeof ReportUserSchema>;

// --- Admin moderation schemas ---

export const AdminWarnSchema = z.object({
  user_id: z.string().uuid(),
  reason: z.string().min(1).max(2000),
  report_id: z.string().uuid().optional().nullable(),
});
export type AdminWarn = z.infer<typeof AdminWarnSchema>;

export const AdminSuspendSchema = AdminWarnSchema.extend({
  duration_days: z.number().int().min(1).max(365),
});
export type AdminSuspend = z.infer<typeof AdminSuspendSchema>;

export const AdminBanSchema = AdminWarnSchema.extend({
  cancel_rides: z.boolean().default(false),
});
export type AdminBan = z.infer<typeof AdminBanSchema>;

export const AdminResolveReportSchema = z.object({
  report_id: z.string().uuid(),
  status: z.enum(['resolved', 'dismissed']),
  admin_notes: z.string().max(2000).optional().nullable(),
});
export type AdminResolveReport = z.infer<typeof AdminResolveReportSchema>;
