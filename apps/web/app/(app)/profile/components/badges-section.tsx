"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Badge {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  earned_at: string;
}

interface BadgesSectionProps {
  userId: string;
  initialBadges?: Badge[];
}

/**
 * Achievement badges display for user profiles.
 * Shows earned badges as colored pill cards with emoji icon and name.
 */
export function BadgesSection({ userId, initialBadges }: BadgesSectionProps) {
  const [badges, setBadges] = useState<Badge[]>(initialBadges ?? []);
  const [loading, setLoading] = useState(!initialBadges);

  useEffect(() => {
    if (initialBadges) return;

    const supabase = createClient();
    supabase
      .rpc("get_user_badges", { p_user_id: userId })
      .then(({ data }) => {
        if (data) setBadges(data as Badge[]);
        setLoading(false);
      });
  }, [userId, initialBadges]);

  if (loading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-7 w-20 animate-pulse rounded-full bg-border-pastel"
          />
        ))}
      </div>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text-main">Badges</h3>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge.badge_id}
            className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
            title={badge.description}
          >
            <span>{badge.icon}</span>
            {badge.name}
          </span>
        ))}
      </div>
    </div>
  );
}
