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

// Query builders - reviews, reports & moderation
export {
  getReviewsForUser,
  getExistingReview,
  getReportsForAdmin,
  getReportById,
  getModerationHistory,
  getPlatformStats,
  getPlatformOverview,
  searchUsersForAdmin,
  getReviewsForAdmin,
} from './queries/reviews';

// Constants - review
export {
  REVIEW_MAX_COMMENT_LENGTH,
  REVIEW_DEADLINE_DAYS,
  RATING_MIN,
  RATING_MAX,
  REVIEW_REMINDER_HOURS,
} from './constants/review';

// Constants - moderation
export {
  ACCOUNT_STATUS,
  MODERATION_ACTION_TYPE,
  REPORT_STATUS,
  SUSPENSION_DURATIONS,
  EXPERIENCED_BADGE_THRESHOLD,
} from './constants/moderation';
export type {
  AccountStatus,
  ModerationActionType,
  ReportStatus,
} from './constants/moderation';

// Validation schemas - review & moderation
export {
  SubmitReviewSchema,
  ReportUserSchema,
  AdminWarnSchema,
  AdminSuspendSchema,
  AdminBanSchema,
  AdminResolveReportSchema,
} from './validation/review';
export type {
  SubmitReview,
  ReportUser,
  AdminWarn,
  AdminSuspend,
  AdminBan,
  AdminResolveReport,
} from './validation/review';

// Constants - event
export {
  EVENT_STATUS,
  EVENT_NAME_MIN,
  EVENT_NAME_MAX,
  EVENT_DESCRIPTION_MAX,
} from './constants/event';
export type { EventStatus } from './constants/event';

// Validation schemas - event
export { CreateEventSchema, UpdateEventSchema } from './validation/event';
export type { CreateEvent, UpdateEvent } from './validation/event';

// Query builders - events
export {
  getApprovedEvents,
  getEventById,
  getMyEvents,
  getPendingEventsForAdmin,
  getEventRides,
} from './queries/events';

// Constants - gamification
export {
  USER_LEVELS,
  getUserLevel,
  CO2_SAVINGS_PER_KM,
  BADGE_CATEGORIES,
} from './constants/gamification';
export type {
  UserLevelKey,
  UserLevel,
  BadgeCategory,
} from './constants/gamification';

// Validation types - gamification
export type {
  UserImpactStats,
  UserBadge,
  RouteStreakResult as RouteStreakData,
} from './validation/gamification';

// Query builders - gamification
export {
  getUserImpact,
  getUserBadges,
  getRouteStreaks,
  getAllBadges,
} from './queries/gamification';

// Constants - location
export {
  LOCATION_CHANNEL_PREFIX,
  LOCATION_BROADCAST_EVENT,
  LOCATION_STOPPED_EVENT,
  GPS_CONFIG,
} from './constants/location';
export type { LocationPayload } from './constants/location';

// Types
export type {
  Database,
  ChatConversation,
  ChatMessage,
  NotificationPreferencesRow,
  Review,
  Report,
  UserBlock,
  ModerationAction,
  PlatformStatDaily,
  PendingReview,
  Event,
  EventRide,
  BadgeDefinition,
  UserAchievement,
  RouteStreak,
  UserImpact,
  UserBadgeResult,
  RouteStreakResult,
} from './types/database';
