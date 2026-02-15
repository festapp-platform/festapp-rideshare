"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";

interface PassengerProfile {
  display_name: string;
  avatar_url: string | null;
  rating_avg: number;
}

interface BookingRequest {
  id: string;
  passenger_id: string;
  seats_booked: number;
  status: string;
  created_at: string;
  profiles: PassengerProfile | null;
}

interface BookingRequestCardProps {
  booking: BookingRequest;
  onRespond: () => void;
}

export function BookingRequestCard({
  booking,
  onRespond,
}: BookingRequestCardProps) {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [actionTaken, setActionTaken] = useState<"accepted" | "rejected" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [clickedAction, setClickedAction] = useState<"accept" | "reject" | null>(
    null,
  );

  const profile = booking.profiles;
  const initials = profile
    ? profile.display_name.charAt(0).toUpperCase()
    : "?";
  const relativeTime = formatDistanceToNow(parseISO(booking.created_at), {
    addSuffix: true,
  });

  async function handleRespond(accept: boolean) {
    setIsLoading(true);
    setClickedAction(accept ? "accept" : "reject");
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in");
      setIsLoading(false);
      setClickedAction(null);
      return;
    }

    const { error: rpcError } = await supabase.rpc("respond_to_booking", {
      p_booking_id: booking.id,
      p_driver_id: user.id,
      p_accept: accept,
    });

    if (rpcError) {
      if (rpcError.message.includes("Not enough seats")) {
        setError("Not enough seats available to accept this request");
      } else if (accept) {
        setError("Failed to accept booking");
      } else {
        setError("Failed to reject request");
      }
      setIsLoading(false);
      setClickedAction(null);
      return;
    }

    setActionTaken(accept ? "accepted" : "rejected");
    setIsLoading(false);
    onRespond();
  }

  return (
    <div className="rounded-xl border border-border-pastel bg-surface p-4 transition-opacity duration-300">
      {/* Passenger info */}
      <div className="flex items-center gap-3">
        <Link
          href={`/profile/${booking.passenger_id}`}
          className="flex-shrink-0"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${booking.passenger_id}`}
            className="font-semibold text-text-main hover:underline"
          >
            {profile?.display_name ?? "Unknown"}
          </Link>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            {profile && profile.rating_avg > 0 && (
              <span className="flex items-center gap-0.5">
                <svg
                  className="h-3.5 w-3.5 text-warning"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {profile.rating_avg.toFixed(1)}
              </span>
            )}
            <span>
              Requested {booking.seats_booked}{" "}
              {booking.seats_booked === 1 ? "seat" : "seats"}
            </span>
          </div>
          <p className="text-xs text-text-secondary">{relativeTime}</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        {actionTaken ? (
          <span
            className={`w-full rounded-lg px-4 py-2 text-center text-sm font-medium transition-opacity duration-300 ${
              actionTaken === "accepted"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {actionTaken === "accepted" ? "Accepted" : "Rejected"}
          </span>
        ) : (
          <>
            <button
              onClick={() => handleRespond(true)}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading && clickedAction === "accept" ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : null}
              Accept
            </button>
            <button
              onClick={() => handleRespond(false)}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {isLoading && clickedAction === "reject" ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : null}
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
