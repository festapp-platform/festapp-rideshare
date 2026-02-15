import Link from "next/link";
import { Flag, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPlatformStats } from "@festapp/shared";
import { StatsCards } from "./components/stats-cards";
import { TrendChart } from "./components/trend-chart";

/**
 * Admin dashboard page (ADMN-01).
 * Shows platform stats cards and daily trend charts.
 */
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch live counts for accuracy (vs daily snapshot)
  const today = new Date().toISOString().split("T")[0]!;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]!;
  const thirtyDaysAgo = new Date(Date.now() - 90 * 86400000)
    .toISOString()
    .split("T")[0]!;

  const [
    usersResult,
    ridesResult,
    bookingsResult,
    activeReportsResult,
    newUsersResult,
    newRidesResult,
    newBookingsResult,
    trendResult,
    recentActionsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("rides").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "reviewing"]),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today),
    supabase
      .from("rides")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today),
    getPlatformStats(supabase, thirtyDaysAgo, today),
    supabase
      .from("moderation_actions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", yesterday),
  ]);

  const stats = {
    total_users: usersResult.count ?? 0,
    total_rides: ridesResult.count ?? 0,
    total_bookings: bookingsResult.count ?? 0,
    active_reports: activeReportsResult.count ?? 0,
    new_users_today: newUsersResult.count ?? 0,
    new_rides_today: newRidesResult.count ?? 0,
    new_bookings_today: newBookingsResult.count ?? 0,
  };

  const trendData = trendResult.data ?? [];
  const recentActionsCount = recentActionsResult.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview and statistics
        </p>
      </div>

      {/* Stats cards */}
      <StatsCards stats={stats} />

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/admin/reports?status=open"
          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
        >
          <div className="rounded-lg bg-red-50 p-2 text-red-600">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {stats.active_reports} open report
              {stats.active_reports !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-500">View and resolve</p>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
        >
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {recentActionsCount} recent moderation action
              {recentActionsCount !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-500">Last 24 hours</p>
          </div>
        </Link>
      </div>

      {/* Trend chart */}
      <TrendChart data={trendData} />
    </div>
  );
}
