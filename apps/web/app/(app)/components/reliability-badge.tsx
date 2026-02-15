"use client";

interface DriverReliability {
  total_rides_completed: number;
  total_rides_cancelled: number;
  cancellation_rate: number;
  total_bookings_received: number;
}

interface ReliabilityBadgeProps {
  reliability: DriverReliability | null;
}

export function ReliabilityBadge({ reliability }: ReliabilityBadgeProps) {
  if (!reliability) return null;

  const totalRides =
    reliability.total_rides_completed + reliability.total_rides_cancelled;
  if (totalRides === 0) return null;

  const cancellationRate = Number(reliability.cancellation_rate);
  const rateColor =
    cancellationRate > 20
      ? "text-red-600"
      : cancellationRate > 10
        ? "text-amber-600"
        : "text-success";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        {reliability.total_rides_completed} ride
        {reliability.total_rides_completed !== 1 ? "s" : ""} completed
      </span>
      {cancellationRate > 0 && (
        <span
          className={`inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 font-medium ${rateColor}`}
        >
          {cancellationRate.toFixed(0)}% cancellation
        </span>
      )}
    </div>
  );
}

export type { DriverReliability };
