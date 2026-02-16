"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTE_INTENT_STATUS, formatPrice } from "@festapp/shared";
import { SubscribeButton } from "../../components/subscribe-button";
import { ConfirmDate } from "./confirm-date";
import { RouteMap } from "../../components/route-map";

interface IntentData {
  id: string;
  driver_id: string;
  origin_address: string;
  destination_address: string;
  route_encoded_polyline: string | null;
  seats_total: number;
  price_czk: number | null;
  booking_mode: string;
  notes: string | null;
  status: string;
  confirmed_ride_id: string | null;
  subscriber_count: number;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    rating_avg: number;
    rating_count: number;
  } | null;
}

interface RouteDetailProps {
  intent: IntentData;
  isDriver: boolean;
  currentUserId: string | null;
  isUserSubscribed: boolean;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export function RouteDetail({
  intent,
  isDriver,
  currentUserId,
  isUserSubscribed,
  originLat,
  originLng,
  destLat,
  destLng,
}: RouteDetailProps) {
  const [showConfirmForm, setShowConfirmForm] = useState(false);

  const isActive = intent.status === ROUTE_INTENT_STATUS.ACTIVE;
  const isConfirmed = intent.status === ROUTE_INTENT_STATUS.CONFIRMED;

  return (
    <div className="space-y-6">
      {/* Status badge */}
      {!isActive && (
        <div
          className={`rounded-xl px-4 py-2 text-center text-sm font-medium ${
            isConfirmed
              ? "bg-green-50 text-green-700"
              : intent.status === ROUTE_INTENT_STATUS.CANCELLED
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
          }`}
        >
          {isConfirmed
            ? "This route has been confirmed!"
            : intent.status === ROUTE_INTENT_STATUS.CANCELLED
              ? "This route has been cancelled"
              : "This route has expired"}
        </div>
      )}

      {/* Confirmed ride link */}
      {isConfirmed && intent.confirmed_ride_id && (
        <Link
          href={`/rides/${intent.confirmed_ride_id}`}
          className="block rounded-xl border-2 border-green-200 bg-green-50 p-4 text-center text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
        >
          View the confirmed ride and book a seat
        </Link>
      )}

      {/* Driver card */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-6">
        <div className="flex items-center gap-4">
          <Link href={`/profile/${intent.driver_id}`}>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {intent.profiles?.avatar_url ? (
                <img
                  src={intent.profiles.avatar_url}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                (intent.profiles?.display_name?.[0] ?? "?").toUpperCase()
              )}
            </div>
          </Link>
          <div>
            <Link
              href={`/profile/${intent.driver_id}`}
              className="text-lg font-semibold text-text-main hover:text-primary"
            >
              {intent.profiles?.display_name ?? "Driver"}
            </Link>
            {intent.profiles && intent.profiles.rating_count > 0 && (
              <p className="text-sm text-text-secondary">
                {intent.profiles.rating_avg.toFixed(1)} ({intent.profiles.rating_count} reviews)
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Route map */}
      {intent.route_encoded_polyline && (
        <section className="rounded-2xl border border-border-pastel bg-surface p-4">
          <RouteMap
            encodedPolyline={intent.route_encoded_polyline}
            originLat={originLat}
            originLng={originLng}
            destLat={destLat}
            destLng={destLng}
          />
        </section>
      )}

      {/* Route details */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-main">Route Details</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-green-400" />
            <div>
              <p className="text-xs text-text-secondary">From</p>
              <p className="text-sm font-medium text-text-main">{intent.origin_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-red-400" />
            <div>
              <p className="text-xs text-text-secondary">To</p>
              <p className="text-sm font-medium text-text-main">{intent.destination_address}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-primary/5 px-3 py-1.5 text-text-main">
            {intent.seats_total} {intent.seats_total === 1 ? "seat" : "seats"}
          </span>
          {intent.price_czk != null && (
            <span className="rounded-lg bg-primary/5 px-3 py-1.5 text-text-main">
              {formatPrice(intent.price_czk)}
            </span>
          )}
          <span className="rounded-lg bg-primary/5 px-3 py-1.5 text-text-main">
            {intent.booking_mode === "instant" ? "Instant booking" : "Request to book"}
          </span>
        </div>

        {intent.notes && (
          <div className="mt-4 rounded-lg bg-background p-3">
            <p className="text-xs text-text-secondary">Notes</p>
            <p className="mt-1 text-sm text-text-main">{intent.notes}</p>
          </div>
        )}
      </section>

      {/* Subscriber count */}
      <section className="rounded-2xl border border-border-pastel bg-surface p-6 text-center">
        <p className="text-2xl font-bold text-primary">{intent.subscriber_count}</p>
        <p className="text-sm text-text-secondary">
          {intent.subscriber_count === 1 ? "person" : "people"} waiting for this route
        </p>
      </section>

      {/* Subscribe button for non-driver visitors */}
      {currentUserId && !isDriver && isActive && (
        <SubscribeButton
          intentId={intent.id}
          initialSubscribed={isUserSubscribed}
          subscriberCount={intent.subscriber_count}
        />
      )}

      {/* Not logged in prompt */}
      {!currentUserId && isActive && (
        <Link
          href="/login"
          className="block rounded-xl bg-primary px-6 py-3 text-center text-base font-semibold text-surface transition-colors hover:bg-primary/90"
        >
          Log in to subscribe
        </Link>
      )}

      {/* Driver: Confirm a date */}
      {isDriver && isActive && (
        <div>
          {!showConfirmForm ? (
            <button
              type="button"
              onClick={() => setShowConfirmForm(true)}
              className="w-full rounded-xl bg-primary px-6 py-3 text-base font-semibold text-surface transition-colors hover:bg-primary/90"
            >
              Confirm a Date
            </button>
          ) : (
            <ConfirmDate
              intentId={intent.id}
              defaultSeats={intent.seats_total}
              defaultPrice={intent.price_czk}
              onCancel={() => setShowConfirmForm(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
