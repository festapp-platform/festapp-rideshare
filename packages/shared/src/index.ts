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

// Validation schemas - ride
export {
  LocationSchema,
  CreateRideSchema,
  UpdateRideSchema,
} from './validation/ride';
export type { Location, CreateRide, UpdateRide } from './validation/ride';

// Validation schemas - search
export { SearchRidesSchema } from './validation/search';
export type { SearchRides } from './validation/search';

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

// Constants - pricing
export { PRICING, calculateSuggestedPrice } from './constants/pricing';

// Constants - ride
export {
  RIDE_STATUS,
  BOOKING_MODE,
  LUGGAGE_SIZE,
  MAX_SEATS,
  MIN_SEATS,
  SEARCH_RADIUS_DEFAULT_KM,
  SEARCH_RADIUS_MAX_KM,
} from './constants/ride';

// Design system
export { colors, tabs } from './constants/design';
export type { ColorScheme, ColorTokens, TabName } from './constants/design';

// Onboarding
export { onboardingSteps, ONBOARDING_COMPLETED_KEY, PROFILE_ONBOARDING_COMPLETED_KEY } from './constants/onboarding';
export type { OnboardingStep, OnboardingStepType } from './constants/onboarding';

// Query builders - rides
export {
  getRideById,
  getDriverRides,
  createRide,
  updateRide,
  deleteRide,
  getRideWaypoints,
} from './queries/rides';

// Query builders - search
export { searchNearbyRides } from './queries/search';
export type { SearchParams, NearbyRideResult } from './queries/search';

// Types
export type { Database } from './types/database';
