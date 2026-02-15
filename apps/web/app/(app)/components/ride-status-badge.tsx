import { RIDE_STATUS } from "@festapp/shared";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  [RIDE_STATUS.upcoming]: {
    label: "Upcoming",
    className: "bg-blue-100 text-blue-700",
  },
  [RIDE_STATUS.in_progress]: {
    label: "In Progress",
    className: "bg-green-100 text-green-700",
  },
  [RIDE_STATUS.completed]: {
    label: "Completed",
    className: "bg-gray-100 text-gray-600",
  },
  [RIDE_STATUS.cancelled]: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700",
  },
};

interface RideStatusBadgeProps {
  status: string;
}

export function RideStatusBadge({ status }: RideStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
