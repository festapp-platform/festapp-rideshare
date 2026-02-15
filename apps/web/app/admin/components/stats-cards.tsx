import { Users, Car, CalendarCheck, Flag } from "lucide-react";

interface PlatformStats {
  total_users: number;
  total_rides: number;
  total_bookings: number;
  active_reports: number;
  new_users_today: number;
  new_rides_today: number;
  new_bookings_today: number;
}

const cards = [
  {
    key: "total_users" as const,
    label: "Total Users",
    todayKey: "new_users_today" as const,
    icon: Users,
    color: "bg-blue-50 text-blue-600",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    key: "total_rides" as const,
    label: "Total Rides",
    todayKey: "new_rides_today" as const,
    icon: Car,
    color: "bg-green-50 text-green-600",
    badgeColor: "bg-green-100 text-green-700",
  },
  {
    key: "total_bookings" as const,
    label: "Total Bookings",
    todayKey: "new_bookings_today" as const,
    icon: CalendarCheck,
    color: "bg-purple-50 text-purple-600",
    badgeColor: "bg-purple-100 text-purple-700",
  },
  {
    key: "active_reports" as const,
    label: "Active Reports",
    todayKey: null,
    icon: Flag,
    color: "bg-red-50 text-red-600",
    badgeColor: "bg-red-100 text-red-700",
  },
];

export function StatsCards({ stats }: { stats: PlatformStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key];
        const todayValue = card.todayKey ? stats[card.todayKey] : null;

        return (
          <div
            key={card.key}
            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-lg p-2 ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              {todayValue !== null && todayValue > 0 && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${card.badgeColor}`}
                >
                  +{todayValue} today
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              {value.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-gray-500">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
