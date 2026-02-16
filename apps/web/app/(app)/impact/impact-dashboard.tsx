"use client";

import { getUserLevel, USER_LEVELS } from "@festapp/shared";
import type { UserLevelKey } from "@festapp/shared";
import { Wallet, Car, Route, Users, Flame } from "lucide-react";
import { ShareButton } from "../components/share-button";

interface ImpactStats {
  total_rides_completed: number;
  total_money_saved_czk: number;
  total_distance_km: number;
  total_passengers_carried: number;
}

interface Badge {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  earned_at: string;
}

interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number | null;
}

interface Streak {
  id: string;
  origin_address: string;
  destination_address: string;
  current_streak: number;
  longest_streak: number;
  last_ride_week: string;
}

interface ImpactDashboardProps {
  impact: ImpactStats | null;
  badges: Badge[];
  allBadges: BadgeDef[];
  streaks: Streak[];
  completedRides: number;
  ratingAvg: number;
}

const LEVEL_COLORS: Record<string, string> = {
  New: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  Regular: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40",
  Experienced: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40",
  Ambassador: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40",
};

const LEVEL_ORDER: UserLevelKey[] = ["NEW", "REGULAR", "EXPERIENCED", "AMBASSADOR"];

export function ImpactDashboard({
  impact,
  badges,
  allBadges,
  streaks,
  completedRides,
  ratingAvg,
}: ImpactDashboardProps) {
  const level = getUserLevel(completedRides, ratingAvg);

  // Find next level
  const currentLevelIdx = LEVEL_ORDER.findIndex(
    (k) => USER_LEVELS[k].name === level.name
  );
  const nextLevel =
    currentLevelIdx < LEVEL_ORDER.length - 1
      ? USER_LEVELS[LEVEL_ORDER[currentLevelIdx + 1]]
      : null;

  // Progress to next level (based on rides)
  const progressToNext = nextLevel
    ? Math.min(
        100,
        Math.round(
          ((completedRides - level.minRides) /
            (nextLevel.minRides - level.minRides)) *
            100
        )
      )
    : 100;

  const earnedBadgeIds = new Set(badges.map((b) => b.badge_id));

  return (
    <div className="space-y-6">
      {/* User Level */}
      <div className="rounded-2xl border border-border-pastel bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              Your Level
            </p>
            <p
              className={`mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${LEVEL_COLORS[level.name] ?? LEVEL_COLORS.New}`}
            >
              {level.name}
            </p>
          </div>
          <ShareButton
            title="My Rideshare Stats"
            text={`I've completed ${impact?.total_rides_completed ?? 0} shared rides on spolujizda.online!`}
            url="/impact"
            label="Share Stats"
          />
        </div>
        {nextLevel && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>{level.name}</span>
              <span>
                {completedRides}/{nextLevel.minRides} rides to {nextLevel.name}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-border-pastel">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
          </div>
        )}
        {!nextLevel && (
          <p className="mt-2 text-xs text-text-secondary">
            Maximum level reached
          </p>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Car className="h-5 w-5 text-primary" />}
          label="Rides"
          value={String(impact?.total_rides_completed ?? 0)}
          gradient="from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5 text-secondary" />}
          label="Money Saved"
          value={`${impact?.total_money_saved_czk ?? 0} CZK`}
          gradient="from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30"
        />
        <StatCard
          icon={<Route className="h-5 w-5 text-accent" />}
          label="Distance"
          value={`${impact?.total_distance_km?.toFixed(0) ?? "0"} km`}
          gradient="from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-secondary" />}
          label="Passengers"
          value={String(impact?.total_passengers_carried ?? 0)}
          gradient="from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30"
        />
      </div>

      {/* Badges */}
      <div className="rounded-2xl border border-border-pastel bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold text-text-main">
          Achievement Badges
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {allBadges.map((badge) => {
            const earned = earnedBadgeIds.has(badge.id);
            const earnedBadge = badges.find((b) => b.badge_id === badge.id);
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                  earned
                    ? "border-primary/20 bg-primary/5"
                    : "border-border-pastel bg-background opacity-50"
                }`}
              >
                <span className="text-2xl">{badge.icon}</span>
                <p
                  className={`mt-1 text-xs font-semibold ${earned ? "text-text-main" : "text-text-secondary"}`}
                >
                  {badge.name}
                </p>
                <p className="mt-0.5 text-[10px] text-text-secondary">
                  {earned && earnedBadge
                    ? new Date(earnedBadge.earned_at).toLocaleDateString()
                    : badge.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Route Streaks */}
      {streaks.length > 0 && (
        <div className="rounded-2xl border border-border-pastel bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold text-text-main">
            Route Streaks
          </h2>
          <div className="space-y-3">
            {streaks.map((streak) => (
              <div
                key={streak.id}
                className="flex items-center gap-3 rounded-xl border border-border-pastel bg-background p-3"
              >
                <Flame className="h-5 w-5 flex-shrink-0 text-orange-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-main">
                    {streak.origin_address} &rarr;{" "}
                    {streak.destination_address}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
                    <span>
                      Current: <strong>{streak.current_streak}</strong> weeks
                    </span>
                    <span>
                      Best: <strong>{streak.longest_streak}</strong> weeks
                    </span>
                  </div>
                </div>
                {/* Streak bar */}
                <div className="flex h-8 w-24 flex-shrink-0 items-end gap-[2px]">
                  {Array.from({ length: Math.min(streak.longest_streak, 12) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm ${
                          i < streak.current_streak
                            ? "bg-orange-400"
                            : "bg-border-pastel"
                        }`}
                        style={{
                          height: `${Math.max(20, (i + 1) * (100 / Math.min(streak.longest_streak, 12)))}%`,
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border-pastel bg-gradient-to-br ${gradient} p-4`}
    >
      <div className="mb-2">{icon}</div>
      <p className="text-lg font-bold text-text-main">{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}
