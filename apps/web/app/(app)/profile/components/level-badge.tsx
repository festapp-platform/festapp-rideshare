"use client";

import { getUserLevel, USER_LEVELS } from "@festapp/shared";
import type { UserLevelKey } from "@festapp/shared";

interface LevelBadgeProps {
  completedRides: number;
  ratingAvg: number;
  variant?: "small" | "large";
}

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  New: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
  Regular: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Experienced: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  Ambassador: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
};

const LEVEL_ICONS: Record<string, string> = {
  New: "N",
  Regular: "R",
  Experienced: "E",
  Ambassador: "A",
};

const LEVEL_ORDER: UserLevelKey[] = ["NEW", "REGULAR", "EXPERIENCED", "AMBASSADOR"];

/**
 * User level badge component.
 * Small variant: compact pill for ride cards.
 * Large variant: full badge with progress bar for profiles.
 */
export function LevelBadge({
  completedRides,
  ratingAvg,
  variant = "small",
}: LevelBadgeProps) {
  const level = getUserLevel(completedRides, ratingAvg);
  const style = LEVEL_STYLES[level.name] ?? LEVEL_STYLES.New;

  if (variant === "small") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text} ${style.border}`}
      >
        {level.name}
      </span>
    );
  }

  // Large variant with progress to next level
  const currentLevelIdx = LEVEL_ORDER.findIndex(
    (k) => USER_LEVELS[k].name === level.name
  );
  const nextLevel =
    currentLevelIdx < LEVEL_ORDER.length - 1
      ? USER_LEVELS[LEVEL_ORDER[currentLevelIdx + 1]]
      : null;

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

  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${style.bg} ${style.text} ${style.border}`}
      >
        {level.name}
      </span>
      {nextLevel && (
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] text-text-secondary">
            <span>{completedRides} rides</span>
            <span>{nextLevel.minRides} for {nextLevel.name}</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-border-pastel">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
