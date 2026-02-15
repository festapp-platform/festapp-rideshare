// Validation schemas
export {
  PhoneSchema,
  EmailSchema,
  OtpSchema,
  PasswordSchema,
  DisplayNameSchema,
  SignUpSchema,
  LoginSchema,
} from './validation/auth';

// Constants
export {
  OTP_LENGTH,
  OTP_EXPIRY_SECONDS,
  SESSION_REFRESH_THRESHOLD_SECONDS,
} from './constants/auth';

// Design system
export { colors, tabs } from './constants/design';
export type { ColorScheme, ColorTokens, TabName } from './constants/design';

// Onboarding
export { onboardingSteps, ONBOARDING_COMPLETED_KEY } from './constants/onboarding';
export type { OnboardingStep, OnboardingStepType } from './constants/onboarding';

// Types
export type { Database } from './types/database';
