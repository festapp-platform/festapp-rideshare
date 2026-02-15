import { z } from 'zod';
import { DisplayNameSchema } from './profile';

// Re-export DisplayNameSchema for backward compatibility with existing imports.
// Single source of truth is in profile.ts.
export { DisplayNameSchema };

export const PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in international format (+420...)');

export const EmailSchema = z.string().email();

export const OtpSchema = z
  .string()
  .length(6, 'Code must be 6 digits')
  .regex(/^\d+$/, 'Code must be numeric');

export const PasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters');

export const SignUpSchema = z.object({
  display_name: DisplayNameSchema,
  email: EmailSchema,
  password: PasswordSchema,
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
