"use client";

import { RIDE_STATUS } from "@festapp/shared";
import { useI18n } from "@/lib/i18n/provider";

const statusClassNames: Record<string, string> = {
  [RIDE_STATUS.upcoming]: "bg-blue-100 text-blue-700",
  [RIDE_STATUS.in_progress]: "bg-green-100 text-green-700",
  [RIDE_STATUS.completed]: "bg-gray-100 text-gray-600",
  [RIDE_STATUS.cancelled]: "bg-red-100 text-red-700",
};

const statusKeyMap: Record<string, string> = {
  [RIDE_STATUS.upcoming]: "rideStatus.upcoming",
  [RIDE_STATUS.in_progress]: "rideStatus.inProgress",
  [RIDE_STATUS.completed]: "rideStatus.completed",
  [RIDE_STATUS.cancelled]: "rideStatus.cancelled",
};

interface RideStatusBadgeProps {
  status: string;
}

export function RideStatusBadge({ status }: RideStatusBadgeProps) {
  const { t } = useI18n();

  const className = statusClassNames[status] ?? "bg-gray-100 text-gray-600";
  const label = statusKeyMap[status] ? t(statusKeyMap[status]) : status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
