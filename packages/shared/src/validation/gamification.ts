/**
 * Gamification validation types.
 * No user input for gamification -- these are type exports only.
 */

/** Impact stats returned by get_user_impact RPC */
export interface UserImpactStats {
  total_rides_completed: number;
  total_co2_saved_kg: number;
  total_money_saved_czk: number;
  total_distance_km: number;
  total_passengers_carried: number;
}

/** Badge with earned status from get_user_badges RPC */
export interface UserBadge {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  earned_at: string;
}

/** Route streak from get_route_streaks RPC */
export interface RouteStreakResult {
  id: string;
  origin_address: string;
  destination_address: string;
  current_streak: number;
  longest_streak: number;
  last_ride_week: string;
}
