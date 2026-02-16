"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  MapPin,
  Car,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { EVENT_STATUS, formatPrice } from "@festapp/shared";
import type { EventRide } from "@festapp/shared";
import { ShareButton } from "../../components/share-button";

interface EventCreator {
  id: string;
  display_name: string;
  avatar_url: string | null;
  rating_avg: number;
}

interface EventData {
  id: string;
  name: string;
  description: string | null;
  location_address: string;
  event_date: string;
  event_end_date: string | null;
  status: string;
  admin_notes: string | null;
  creator_id: string;
  created_at: string;
  creator: EventCreator | null;
}

interface EventDetailProps {
  event: EventData;
  rides: EventRide[];
  currentUserId: string | null;
}

export function EventDetail({ event, rides, currentUserId }: EventDetailProps) {
  const date = parseISO(event.event_date);
  const isCreator = currentUserId === event.creator_id;
  const isPending = event.status === EVENT_STATUS.PENDING;
  const isRejected = event.status === EVENT_STATUS.REJECTED;
  const isApproved = event.status === EVENT_STATUS.APPROVED;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Status badges for creator */}
      {isCreator && isPending && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          <Clock className="h-4 w-4 flex-shrink-0" />
          Pending admin approval
        </div>
      )}

      {isRejected && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            This event was not approved.
          </div>
          {event.admin_notes && (
            <p className="mt-1 text-xs">Reason: {event.admin_notes}</p>
          )}
        </div>
      )}

      {/* Event header */}
      <div className="rounded-2xl border border-border-pastel bg-surface p-6">
        <div className="mb-4 flex items-start justify-between">
          <h1 className="text-2xl font-bold text-text-main">{event.name}</h1>
          <ShareButton
            title={event.name}
            text={`${event.name} on ${format(date, "MMMM d, yyyy")} - Find rides to this event!`}
            url={`/events/${event.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-border-pastel px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-primary/5"
          />
        </div>

        {event.description && (
          <p className="mb-4 text-sm text-text-secondary whitespace-pre-line">
            {event.description}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-text-main">
            <Calendar className="h-4 w-4 flex-shrink-0 text-text-secondary" />
            <span>{format(date, "EEEE, MMMM d, yyyy 'at' h:mm a")}</span>
          </div>
          {event.event_end_date && (
            <div className="flex items-center gap-2 text-sm text-text-main">
              <Calendar className="h-4 w-4 flex-shrink-0 text-text-secondary" />
              <span>
                Ends{" "}
                {format(
                  parseISO(event.event_end_date),
                  "EEEE, MMMM d, yyyy 'at' h:mm a",
                )}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-text-main">
            <MapPin className="h-4 w-4 flex-shrink-0 text-text-secondary" />
            <span>{event.location_address}</span>
          </div>
        </div>

        {/* Creator info */}
        {event.creator && (
          <div className="mt-4 flex items-center gap-2 border-t border-border-pastel pt-4">
            <Link href={`/profile/${event.creator.id}`}>
              {event.creator.avatar_url ? (
                <img
                  src={event.creator.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {event.creator.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <div className="text-sm">
              <Link
                href={`/profile/${event.creator.id}`}
                className="font-medium text-text-main hover:underline"
              >
                {event.creator.display_name}
              </Link>
              <p className="text-xs text-text-secondary">Event organizer</p>
            </div>
          </div>
        )}
      </div>

      {/* Rides section - only for approved events */}
      {isApproved && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-main">
              Rides to this event
            </h2>
            <Link
              href={`/rides/new?eventId=${event.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-primary/90"
            >
              <Car className="h-4 w-4" />
              Offer a ride
            </Link>
          </div>

          {rides.length === 0 ? (
            <div className="rounded-2xl border border-border-pastel bg-surface p-8 text-center">
              <Car className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <p className="text-sm text-text-secondary">
                No rides linked to this event yet. Be the first to offer one!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => (
                <EventRideCard key={ride.ride_id} ride={ride} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventRideCard({ ride }: { ride: EventRide }) {
  const departureDate = parseISO(ride.departure_time);

  return (
    <Link
      href={`/rides/${ride.ride_id}`}
      className="block rounded-2xl border border-border-pastel bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {/* Driver info */}
        <div className="flex items-center gap-3">
          {ride.driver_avatar ? (
            <img
              src={ride.driver_avatar}
              alt={ride.driver_name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {ride.driver_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-text-main">
              {ride.driver_name}
            </span>
            {ride.driver_rating > 0 && (
              <span className="text-xs text-text-secondary">
                {ride.driver_rating.toFixed(1)} stars
              </span>
            )}
          </div>

          <div className="mb-1 flex items-center gap-2 text-sm text-text-main">
            <span className="truncate">{ride.origin_address}</span>
            <span className="text-text-secondary">to</span>
            <span className="truncate">{ride.destination_address}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
            <span>{format(departureDate, "EEE, MMM d 'at' h:mm a")}</span>
            <span>
              {ride.seats_available}{" "}
              {ride.seats_available === 1 ? "seat" : "seats"} left
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-bold text-primary">
            {formatPrice(ride.price_czk)}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              ride.booking_mode === "instant"
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning"
            }`}
          >
            {ride.booking_mode === "instant" ? "Instant" : "Request"}
          </span>
        </div>
      </div>
    </Link>
  );
}
