"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "@festapp/shared";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Notification preferences page (UX-06).
 * Three grouped toggles (Push, Email, Reminders) replacing 9 individual toggles.
 * Each group toggle sets all underlying DB columns in that group.
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

/** Column keys that belong to each group */
const PUSH_KEYS: (keyof Preferences)[] = [
  "push_booking_requests",
  "push_booking_confirmations",
  "push_booking_cancellations",
  "push_new_messages",
  "push_ride_reminders",
  "push_route_alerts",
];

const EMAIL_KEYS: (keyof Preferences)[] = [
  "email_booking_confirmations",
  "email_ride_reminders",
  "email_cancellations",
];

const REMINDER_KEYS: (keyof Preferences)[] = [
  "push_ride_reminders",
  "email_ride_reminders",
];

/** Compute group state: ON if at least one sub-value is true (mixed = ON), OFF if all false */
function computeGroupState(prefs: Preferences, keys: (keyof Preferences)[]): boolean {
  return keys.some((k) => prefs[k]);
}

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

export default function NotificationPreferencesPage() {
  const { t } = useI18n();
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
        console.error("Error loading preferences:", error);
        toast.error(t("notifications.loadFailed"));
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

      setLoading(false);
    };

    loadPreferences();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGroupToggle = useCallback(
    async (keys: (keyof Preferences)[], value: boolean) => {
      if (!userId) return;

      // Optimistic update: set all keys in the group
      const prevPreferences = { ...preferences };
      const updated = { ...preferences };
      for (const key of keys) {
        updated[key] = value;
      }
      setPreferences(updated);

      const supabase = createClient();
      const { error } = await upsertNotificationPreferences(supabase, {
        user_id: userId,
        ...updated,
      });

      if (error) {
        setPreferences(prevPreferences);
        toast.error(t("notifications.preferenceFailed"));
        console.error("Error updating preferences:", error);
      } else {
        toast.success(t("notifications.preferenceSaved"));
      }
    },
    [preferences, userId, t],
  );

  const pushOn = computeGroupState(preferences, PUSH_KEYS);
  const emailOn = computeGroupState(preferences, EMAIL_KEYS);
  const remindersOn = computeGroupState(preferences, REMINDER_KEYS);

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
        <h1 className="text-2xl font-bold text-text-main">{t("notifications.title")}</h1>
      </div>

      <div className="space-y-4">
        {/* Push Notifications Group */}
        <div className="overflow-hidden rounded-xl border border-border-pastel bg-surface">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="mr-4">
              <p className="text-sm font-semibold text-text-main">
                {t("notifications.pushGroup")}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {t("notifications.pushGroupDesc")}
              </p>
            </div>
            <Toggle
              checked={pushOn}
              onChange={(value) => handleGroupToggle(PUSH_KEYS, value)}
            />
          </div>
        </div>

        {/* Email Notifications Group */}
        <div className="overflow-hidden rounded-xl border border-border-pastel bg-surface">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="mr-4">
              <p className="text-sm font-semibold text-text-main">
                {t("notifications.emailGroup")}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {t("notifications.emailGroupDesc")}
              </p>
            </div>
            <Toggle
              checked={emailOn}
              onChange={(value) => handleGroupToggle(EMAIL_KEYS, value)}
            />
          </div>
        </div>

        {/* Ride Reminders Group */}
        <div className="overflow-hidden rounded-xl border border-border-pastel bg-surface">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="mr-4">
              <p className="text-sm font-semibold text-text-main">
                {t("notifications.remindersGroup")}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {t("notifications.remindersGroupDesc")}
              </p>
            </div>
            <Toggle
              checked={remindersOn}
              onChange={(value) => handleGroupToggle(REMINDER_KEYS, value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
