"use client";

/**
 * Skeleton loading card components (PLAT-11).
 *
 * Pulsing placeholder cards matching ride, message, and profile card dimensions.
 * Uses Tailwind animate-pulse on muted background shapes.
 */

interface SkeletonCardProps {
  variant?: "ride" | "message" | "profile";
}

export function SkeletonCard({ variant = "ride" }: SkeletonCardProps) {
  if (variant === "message") {
    return (
      <div
        data-testid="skeleton-card"
        data-variant="message"
        className="animate-pulse rounded-2xl border border-border-pastel bg-surface p-4"
      >
        <div className="flex items-start gap-3">
          {/* Avatar circle */}
          <div className="h-10 w-10 shrink-0 rounded-full bg-border-pastel/50" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-border-pastel/50" />
            <div className="h-3 w-1/2 rounded bg-border-pastel/50" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div
        data-testid="skeleton-card"
        data-variant="profile"
        className="animate-pulse rounded-2xl border border-border-pastel bg-surface p-6"
      >
        <div className="flex flex-col items-center space-y-3">
          {/* Large avatar circle */}
          <div className="h-16 w-16 rounded-full bg-border-pastel/50" />
          <div className="h-4 w-32 rounded bg-border-pastel/50" />
          <div className="h-3 w-24 rounded bg-border-pastel/50" />
          {/* Badge placeholder */}
          <div className="h-6 w-20 rounded-full bg-border-pastel/50" />
        </div>
      </div>
    );
  }

  // Default: ride variant
  return (
    <div
      data-testid="skeleton-card"
      data-variant="ride"
      className="animate-pulse rounded-2xl border border-border-pastel bg-surface p-4"
    >
      <div className="space-y-3">
        {/* Origin line */}
        <div className="h-4 w-3/4 rounded bg-border-pastel/50" />
        {/* Destination line */}
        <div className="h-4 w-2/3 rounded bg-border-pastel/50" />
        {/* Details row */}
        <div className="flex items-center gap-3">
          <div className="h-3 w-20 rounded bg-border-pastel/50" />
          <div className="h-3 w-16 rounded bg-border-pastel/50" />
          <div className="h-3 w-12 rounded bg-border-pastel/50" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  variant?: "ride" | "message" | "profile";
}

export function SkeletonList({ count = 3, variant = "ride" }: SkeletonListProps) {
  return (
    <div data-testid="skeleton-list" className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}
