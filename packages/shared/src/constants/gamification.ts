/**
 * Gamification constants: user levels and badge categories.
 */

export const USER_LEVELS = {
  NEW: { name: 'New', minRides: 0, minRating: 0 },
  REGULAR: { name: 'Regular', minRides: 3, minRating: 3.0 },
  EXPERIENCED: { name: 'Experienced', minRides: 15, minRating: 4.0 },
  AMBASSADOR: { name: 'Ambassador', minRides: 50, minRating: 4.5 },
} as const;

export type UserLevelKey = keyof typeof USER_LEVELS;
export type UserLevel = (typeof USER_LEVELS)[UserLevelKey];

/**
 * Get the highest user level the user qualifies for based on completed rides and average rating.
 * Returns the level object { name, minRides, minRating }.
 */
export function getUserLevel(completedRides: number, ratingAvg: number): UserLevel {
  // Check from highest to lowest
  if (completedRides >= USER_LEVELS.AMBASSADOR.minRides && ratingAvg >= USER_LEVELS.AMBASSADOR.minRating) {
    return USER_LEVELS.AMBASSADOR;
  }
  if (completedRides >= USER_LEVELS.EXPERIENCED.minRides && ratingAvg >= USER_LEVELS.EXPERIENCED.minRating) {
    return USER_LEVELS.EXPERIENCED;
  }
  if (completedRides >= USER_LEVELS.REGULAR.minRides && ratingAvg >= USER_LEVELS.REGULAR.minRating) {
    return USER_LEVELS.REGULAR;
  }
  return USER_LEVELS.NEW;
}

export const BADGE_CATEGORIES = {
  RIDES: 'rides',
  REVIEWS: 'reviews',
  STREAKS: 'streaks',
  SPECIAL: 'special',
} as const;

export type BadgeCategory = (typeof BADGE_CATEGORIES)[keyof typeof BADGE_CATEGORIES];
