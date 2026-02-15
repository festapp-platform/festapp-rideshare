// Validation schemas - auth
export {
  PhoneSchema,
  EmailSchema,
  OtpSchema,
  PasswordSchema,
  SignUpSchema,
  LoginSchema,
} from './validation/auth';

// Validation schemas - profile & vehicle
export {
  DisplayNameSchema,
  BioSchema,
  SocialLinksSchema,
  UserRoleSchema,
  ProfileUpdateSchema,
  VehicleSchema,
} from './validation/profile';
export type {
  DisplayName,
  Bio,
  SocialLinks,
  UserRole,
  ProfileUpdate,
  Vehicle,
} from './validation/profile';

// Constants - auth
export {
  OTP_LENGTH,
  OTP_EXPIRY_SECONDS,
  SESSION_REFRESH_THRESHOLD_SECONDS,
} from './constants/auth';

// Constants - storage
export {
  STORAGE_BUCKETS,
  IMAGE_CONSTRAINTS,
  ALLOWED_IMAGE_TYPES,
  getAvatarPath,
  getVehiclePhotoPath,
} from './constants/storage';

// Design system
export { colors, tabs } from './constants/design';
export type { ColorScheme, ColorTokens, TabName } from './constants/design';

// Onboarding
export { onboardingSteps, ONBOARDING_COMPLETED_KEY, PROFILE_ONBOARDING_COMPLETED_KEY } from './constants/onboarding';
export type { OnboardingStep, OnboardingStepType } from './constants/onboarding';

// Types
export type { Database } from './types/database';
