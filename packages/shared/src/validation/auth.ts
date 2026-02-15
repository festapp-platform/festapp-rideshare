import { z } from 'zod';

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

export const DisplayNameSchema = z.string().min(1).max(50);

export const SignUpSchema = z.object({
  display_name: DisplayNameSchema,
  email: EmailSchema,
  password: PasswordSchema,
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
