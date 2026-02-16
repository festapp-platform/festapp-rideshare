"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatPrice } from "@festapp/shared";

interface RouteIntentItem {
  id: string;
  origin_address: string;
  destination_address: string;
  seats_total: number;
  price_czk: number | null;
  booking_mode: string;
  subscriber_count: number;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    rating_avg: number;
    rating_count: number;
  } | null;
}

interface RouteIntentListProps {
  intents: RouteIntentItem[];
}

export function RouteIntentList({ intents }: RouteIntentListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return intents;
    const q = search.toLowerCase();
    return intents.filter(
      (i) =>
        i.origin_address.toLowerCase().includes(q) ||
        i.destination_address.toLowerCase().includes(q),
    );
  }, [intents, search]);

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by origin or destination..."
          className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border-pastel bg-surface p-8 text-center">
          <p className="text-text-secondary">
            {search ? "No routes match your search." : "No active routes yet. Be the first to post one!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((intent) => (
            <Link
              key={intent.id}
              href={`/routes/${intent.id}`}
              className="rounded-2xl border border-border-pastel bg-surface p-5 transition-colors hover:border-primary/30"
            >
              {/* Driver info */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {intent.profiles?.avatar_url ? (
                    <img
                      src={intent.profiles.avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    (intent.profiles?.display_name?.[0] ?? "?").toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-main">
                    {intent.profiles?.display_name ?? "Driver"}
                  </p>
                  {intent.profiles && intent.profiles.rating_count > 0 && (
                    <p className="text-xs text-text-secondary">
                      {intent.profiles.rating_avg.toFixed(1)} ({intent.profiles.rating_count})
                    </p>
                  )}
                </div>
              </div>

              {/* Route */}
              <div className="mb-3 space-y-1">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-400" />
                  <p className="text-sm text-text-main line-clamp-1">{intent.origin_address}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-red-400" />
                  <p className="text-sm text-text-main line-clamp-1">{intent.destination_address}</p>
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                <span className="rounded-lg bg-primary/5 px-2 py-1">
                  {intent.seats_total} {intent.seats_total === 1 ? "seat" : "seats"}
                </span>
                {intent.price_czk != null && (
                  <span className="rounded-lg bg-primary/5 px-2 py-1">
                    {formatPrice(intent.price_czk)}
                  </span>
                )}
                <span className="rounded-lg bg-primary/5 px-2 py-1">
                  {intent.booking_mode === "instant" ? "Instant" : "Request"}
                </span>
                {intent.subscriber_count > 0 && (
                  <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700">
                    {intent.subscriber_count} waiting
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
