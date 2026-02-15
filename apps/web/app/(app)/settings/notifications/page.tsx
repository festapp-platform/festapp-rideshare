"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@festapp/shared";
import { toast } from "sonner";

/**
 * Notification preferences page (NOTF-06).
 * Toggle switches for push and email notification categories.
 * Preferences persist to notification_preferences table via upsert.
 */

interface Preferences {
  push_booking_requests: boolean;
  push_booking_confirmations: boolean;
  push_booking_cancellations: boolean;
  push_new_messages: boolean;
  push_ride_reminders: boolean;
  push_route_alerts: boolean;
  email_booking_confirmations: boolean;
  email_ride_reminders: boolean;
  email_cancellations: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  push_booking_requests: true,
  push_booking_confirmations: true,
  push_booking_cancellations: true,
  push_new_messages: true,
  push_ride_reminders: true,
  push_route_alerts: true,
  email_booking_confirmations: true,
  email_ride_reminders: true,
  email_cancellations: true,
};

const PUSH_CATEGORIES: {
  key: keyof Preferences;
  label: string;
  description: string;
}[] = [
  {
    key: "push_booking_requests",
    label: "Booking requests",
    description: "Get notified when someone wants to join your ride",
  },
  {
    key: "push_booking_confirmations",
    label: "Booking confirmations",
    description: "Get notified when your booking is confirmed",
  },
  {
    key: "push_booking_cancellations",
    label: "Cancellations",
    description: "Get notified when a booking or ride is cancelled",
  },
  {
    key: "push_new_messages",
    label: "New messages",
    description: "Get notified when you receive a chat message",
  },
  {
    key: "push_ride_reminders",
    label: "Ride reminders",
    description: "Get reminded before your ride departs",
  },
  {
    key: "push_route_alerts",
    label: "Route alerts",
    description: "Get notified when a new ride matches your saved route",
  },
];

const EMAIL_CATEGORIES: {
  key: keyof Preferences;
  label: string;
  description: string;
}[] = [
  {
    key: "email_booking_confirmations",
    label: "Booking confirmations",
    description: "Receive email when a booking is confirmed",
  },
  {
    key: "email_ride_reminders",
    label: "Ride reminders",
    description: "Receive email reminder before your ride departs",
  },
  {
    key: "email_cancellations",
    label: "Cancellations",
    description: "Receive email when a booking or ride is cancelled",
  },
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        checked ? "bg-primary" : "bg-border-pastel"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function PreferenceSection({
  title,
  categories,
  preferences,
  onToggle,
}: {
  title: string;
  categories: { key: keyof Preferences; label: string; description: string }[];
  preferences: Preferences;
  onToggle: (key: keyof Preferences, value: boolean) => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </h3>
      <div className="overflow-hidden rounded-xl border border-border-pastel bg-surface">
        {categories.map((cat, index) => (
          <div
            key={cat.key}
            className={`flex items-center justify-between px-4 py-3 ${
              index < categories.length - 1
                ? "border-b border-border-pastel"
                : ""
            }`}
          >
            <div className="mr-4">
              <p className="text-sm font-medium text-text-main">{cat.label}</p>
              <p className="text-xs text-text-secondary">{cat.description}</p>
            </div>
            <Toggle
              checked={preferences[cat.key]}
              onChange={(value) => onToggle(cat.key, value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      setUserId(user.id);

      const { data, error } = await getNotificationPreferences(supabase);

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found (single() with no match)
        console.error("Error loading preferences:", error);
        toast.error("Failed to load notification preferences");
      }

      if (data) {
        setPreferences({
          push_booking_requests: data.push_booking_requests,
          push_booking_confirmations: data.push_booking_confirmations,
          push_booking_cancellations: data.push_booking_cancellations,
          push_new_messages: data.push_new_messages,
          push_ride_reminders: data.push_ride_reminders,
          push_route_alerts: data.push_route_alerts,
          email_booking_confirmations: data.email_booking_confirmations,
          email_ride_reminders: data.email_ride_reminders,
          email_cancellations: data.email_cancellations,
        });
      }
      // If no data (null), keep defaults (all ON)

      setLoading(false);
    };

    loadPreferences();
  }, []);

  const handleToggle = useCallback(
    async (key: keyof Preferences, value: boolean) => {
      if (!userId) return;

      // Optimistic update
      const prevPreferences = { ...preferences };
      const updated = { ...preferences, [key]: value };
      setPreferences(updated);

      const supabase = createClient();
      const { error } = await upsertNotificationPreferences(supabase, {
        user_id: userId,
        ...updated,
      });

      if (error) {
        // Revert on error
        setPreferences(prevPreferences);
        toast.error("Failed to update preference");
        console.error("Error updating preference:", error);
      } else {
        toast.success("Preference updated");
      }
    },
    [preferences, userId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary/5 hover:text-text-main"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-text-main">Notifications</h1>
      </div>

      <PreferenceSection
        title="Push Notifications"
        categories={PUSH_CATEGORIES}
        preferences={preferences}
        onToggle={handleToggle}
      />

      <PreferenceSection
        title="Email Notifications"
        categories={EMAIL_CATEGORIES}
        preferences={preferences}
        onToggle={handleToggle}
      />
    </div>
  );
}
