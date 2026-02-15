"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Calendar, MapPin, User, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EVENT_STATUS } from "@festapp/shared";

type TabStatus = "pending" | "approved" | "rejected";

interface AdminEvent {
  id: string;
  name: string;
  description: string | null;
  location_address: string;
  event_date: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  creator: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Admin events list page at /admin/events.
 * Shows pending, approved, and rejected events in tabs.
 */
export default function AdminEventsPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<TabStatus>("pending");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      const { data } = await supabase
        .from("events")
        .select(
          "id, name, description, location_address, event_date, status, admin_notes, created_at, creator:profiles!events_creator_id_fkey(id, display_name, avatar_url)",
        )
        .eq("status", activeTab)
        .order("created_at", { ascending: activeTab === "pending" });

      // Normalize creator from PostgREST FK join (may be array or object)
      const normalized = (data ?? []).map((e: Record<string, unknown>) => ({
        ...e,
        creator: Array.isArray(e.creator) ? e.creator[0] ?? null : e.creator ?? null,
      }));
      setEvents(normalized as AdminEvent[]);
      setLoading(false);
    }
    fetchEvents();
  }, [activeTab, supabase]);

  const tabs: { key: TabStatus; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Events</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
          No {activeTab} events.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Creator
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Event Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      {event.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-gray-500 truncate max-w-[200px]">
                      {event.location_address}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {event.creator && (
                      <div className="flex items-center gap-2">
                        {event.creator.avatar_url ? (
                          <img
                            src={event.creator.avatar_url}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                            {event.creator.display_name
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-gray-900">
                          {event.creator.display_name}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {format(parseISO(event.event_date), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(parseISO(event.created_at), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
