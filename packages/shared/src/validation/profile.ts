import { z } from 'zod';

/**
 * Profile and vehicle validation schemas.
 *
 * DisplayNameSchema is the single source of truth for display name validation,
 * re-used by both auth (signup) and profile update flows.
 */

export const DisplayNameSchema = z.string().min(1).max(50);

export const BioSchema = z.string().max(300).optional();

export const SocialLinksSchema = z.object({
  instagram: z.string().url().optional().or(z.literal('')),
  facebook: z.string().url().optional().or(z.literal('')),
});

export const UserRoleSchema = z.enum(['rider', 'driver', 'both']);

export const ProfileUpdateSchema = z.object({
  display_name: DisplayNameSchema,
  bio: BioSchema,
  social_links: SocialLinksSchema.optional(),
});

export const VehicleSchema = z.object({
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  color: z.string().min(1).max(30),
  license_plate: z.string().min(1).max(20),
});

// Inferred types
export type DisplayName = z.infer<typeof DisplayNameSchema>;
export type Bio = z.infer<typeof BioSchema>;
export type SocialLinks = z.infer<typeof SocialLinksSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;
