"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Calendar, MapPin, Car, Plus, Search } from "lucide-react";

interface EventItem {
  id: string;
  name: string;
  description: string | null;
  location_address: string;
  event_date: string;
  event_end_date: string | null;
  created_at: string;
  creator: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

interface EventsClientProps {
  events: EventItem[];
}

export function EventsClient({ events }: EventsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.location_address.toLowerCase().includes(q),
    );
  }, [events, searchQuery]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-main">Events</h1>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events by name or location..."
          className="w-full rounded-xl border border-border-pastel bg-background py-3 pl-10 pr-4 text-sm text-text-main placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Event grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border-pastel bg-surface p-8 text-center">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm text-text-secondary">
            {searchQuery
              ? "No events match your search."
              : "No upcoming events yet. Be the first to create one!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: EventItem }) {
  const date = parseISO(event.event_date);

  return (
    <Link
      href={`/events/${event.id}`}
      className="block rounded-2xl border border-border-pastel bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <h3 className="mb-2 text-lg font-semibold text-text-main line-clamp-2">
        {event.name}
      </h3>

      {event.description && (
        <p className="mb-3 text-sm text-text-secondary line-clamp-2">
          {event.description}
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span>{format(date, "EEE, MMM d 'at' h:mm a")}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{event.location_address}</span>
        </div>
      </div>

      {event.creator && (
        <div className="mt-3 flex items-center gap-2 border-t border-border-pastel pt-3">
          {event.creator.avatar_url ? (
            <img
              src={event.creator.avatar_url}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {event.creator.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-text-secondary">
            by {event.creator.display_name}
          </span>
        </div>
      )}
    </Link>
  );
}
