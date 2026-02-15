"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { getDriverRides, RIDE_STATUS } from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import { RideStatusBadge } from "../components/ride-status-badge";

type RideRow = {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  price_czk: number | null;
  status: string;
};

type TabKey = "upcoming" | "past";

/**
 * My Rides page showing the driver's upcoming and past rides.
 * Client component for state management and data fetching.
 */
export default function MyRidesPage() {
  const supabase = createClient();
  const [rides, setRides] = useState<RideRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");

  useEffect(() => {
    async function fetchRides() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data } = await getDriverRides(supabase, user.id);
      if (data) setRides(data as RideRow[]);
      setIsLoading(false);
    }
    fetchRides();
  }, [supabase]);

  const upcomingRides = rides
    .filter(
      (r) =>
        r.status === RIDE_STATUS.upcoming ||
        r.status === RIDE_STATUS.in_progress,
    )
    .sort(
      (a, b) =>
        new Date(a.departure_time).getTime() -
        new Date(b.departure_time).getTime(),
    );

  const pastRides = rides
    .filter(
      (r) =>
        r.status === RIDE_STATUS.completed ||
        r.status === RIDE_STATUS.cancelled,
    )
    .sort(
      (a, b) =>
        new Date(b.departure_time).getTime() -
        new Date(a.departure_time).getTime(),
    );

  const displayedRides = activeTab === "upcoming" ? upcomingRides : pastRides;

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-text-main">My Rides</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-border-pastel bg-surface"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">My Rides</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-background p-1">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "upcoming"
              ? "bg-surface text-text-main shadow-sm"
              : "text-text-secondary hover:text-text-main"
          }`}
        >
          Upcoming ({upcomingRides.length})
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "past"
              ? "bg-surface text-text-main shadow-sm"
              : "text-text-secondary hover:text-text-main"
          }`}
        >
          Past ({pastRides.length})
        </button>
      </div>

      {/* Rides list */}
      {displayedRides.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-border-pastel bg-surface p-12">
          <span className="mb-2 text-4xl">
            {activeTab === "upcoming" ? "🚗" : "📋"}
          </span>
          <h2 className="mb-2 text-xl font-bold text-text-main">
            {activeTab === "upcoming"
              ? "No upcoming rides"
              : "No past rides"}
          </h2>
          <p className="mb-4 text-sm text-text-secondary">
            {activeTab === "upcoming"
              ? "Post a ride to get started!"
              : "Your completed and cancelled rides will appear here."}
          </p>
          {activeTab === "upcoming" && (
            <Link
              href="/rides/new"
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-primary/90"
            >
              Post a Ride
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedRides.map((ride) => {
            const departure = parseISO(ride.departure_time);
            const formattedTime = format(
              departure,
              "EEE, MMM d 'at' h:mm a",
            );

            return (
              <Link
                key={ride.id}
                href={`/rides/${ride.id}`}
                className="block rounded-2xl border border-border-pastel bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-main">
                      <span className="truncate">
                        {ride.origin_address}
                      </span>
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-text-secondary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                      <span className="truncate">
                        {ride.destination_address}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {formattedTime}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <span>
                        {ride.seats_available}/{ride.seats_total} seats
                      </span>
                      <span className="font-medium text-primary">
                        {ride.price_czk != null
                          ? `${ride.price_czk} CZK`
                          : "Free"}
                      </span>
                    </div>
                  </div>
                  <RideStatusBadge status={ride.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
