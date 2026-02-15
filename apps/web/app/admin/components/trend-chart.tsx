"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { PlatformStatDaily } from "@festapp/shared";

// Dynamic import recharts to avoid SSR issues
const RechartsChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        LineChart,
        Line,
        XAxis,
        YAxis,
        Tooltip,
        ResponsiveContainer,
        CartesianGrid,
      } = mod;

      function Chart({ data }: { data: ChartDataPoint[] }) {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              />
              <Line
                type="monotone"
                dataKey="new_users"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="New Users"
              />
              <Line
                type="monotone"
                dataKey="completed_rides"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Completed Rides"
              />
              <Line
                type="monotone"
                dataKey="total_bookings"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                name="New Bookings"
              />
            </LineChart>
          </ResponsiveContainer>
        );
      }

      return Chart;
    }),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-lg bg-gray-100" /> },
);

interface ChartDataPoint {
  date: string;
  new_users: number;
  completed_rides: number;
  total_bookings: number;
}

type DateRange = "7" | "30" | "90";

const rangeLabels: Record<DateRange, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
};

interface TrendChartProps {
  data: PlatformStatDaily[];
}

export function TrendChart({ data }: TrendChartProps) {
  const [range, setRange] = useState<DateRange>("30");

  const chartData = useMemo(() => {
    const days = parseInt(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const filtered = data.filter((d) => d.date >= cutoffStr!);

    // Compute daily deltas for rides and bookings from cumulative totals
    return filtered.map((d, i) => {
      const prev = i > 0 ? filtered[i - 1] : null;
      return {
        date: new Date(d.date).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        }),
        new_users: d.new_users,
        completed_rides: prev
          ? Math.max(0, d.completed_rides - prev.completed_rides)
          : d.completed_rides,
        total_bookings: prev
          ? Math.max(0, d.total_bookings - prev.total_bookings)
          : d.total_bookings,
      };
    });
  }, [data, range]);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Platform Trends</h3>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {(Object.keys(rangeLabels) as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                range === r
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {chartData.length > 0 ? (
        <RechartsChart data={chartData} />
      ) : (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
          No data available for this period
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
          New Users
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
          Completed Rides
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-500" />
          New Bookings
        </span>
      </div>
    </div>
  );
}
