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

// Constants - booking
export { BOOKING_STATUS } from './constants/booking';
export type { BookingStatus } from './constants/booking';

// Validation schemas - booking
export { BookSeatSchema, CancelBookingSchema } from './validation/booking';
export type { BookSeat, CancelBooking } from './validation/booking';

// Query builders - bookings
export {
  getBookingsForRide,
  getPassengerBookings,
  getBookingById,
} from './queries/bookings';

// Validation schemas - chat
export { SendMessageSchema, ChatMessageSchema } from './validation/chat';
export type {
  SendMessage,
  ChatMessage as ChatMessageValidated,
} from './validation/chat';

// Validation schemas - notification
export { NotificationPreferencesSchema } from './validation/notification';
export type { NotificationPreferences } from './validation/notification';

// Constants - notification
export {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  MESSAGE_TYPE,
} from './constants/notification';
export type {
  NotificationType,
  MessageType,
} from './constants/notification';

// Query builders - chat & notifications
export {
  getConversationsForUser,
  getMessages,
  getUnreadCount,
  getNotificationPreferences,
  upsertNotificationPreferences,
} from './queries/chat';

// Types
export type {
  Database,
  ChatConversation,
  ChatMessage,
  NotificationPreferencesRow,
} from './types/database';
