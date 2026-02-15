"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Settings page (NAV-06).
 * Implements logout (AUTH-04) and account deletion (AUTH-05).
 * Accessible from Profile page.
 */

type SectionItem = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  loading?: boolean;
};

function SettingsSection({
  title,
  items,
}: {
  title: string;
  items: SectionItem[];
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </h3>
      <div className="overflow-hidden rounded-xl border border-border-pastel bg-surface">
        {items.map((item, index) => (
          <button
            key={item.label}
            onClick={item.onClick}
            disabled={item.loading}
            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-primary/5 disabled:opacity-50 ${
              index < items.length - 1
                ? "border-b border-border-pastel"
                : ""
            } ${item.destructive ? "text-error" : "text-text-main"}`}
          >
            <span>{item.label}</span>
            {item.loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <svg
                className="h-4 w-4 text-text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert("Failed to log out. Please try again.");
        setIsLoggingOut(false);
        return;
      }
      router.replace("/login");
    } catch {
      alert("An unexpected error occurred.");
      setIsLoggingOut(false);
    }
  };

  const deleteAccount = async () => {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) {
        alert("Failed to delete account. Please try again.");
        setIsDeleting(false);
        return;
      }
      // Sign out after successful deletion
      await supabase.auth.signOut();
      router.replace("/login");
    } catch {
      alert("An unexpected error occurred.");
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    if (
      confirm(
        "Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently removed.",
      )
    ) {
      deleteAccount();
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Settings</h1>

      <SettingsSection
        title="Preferences"
        items={[
          {
            label: "Language",
            onClick: () => alert("Language settings will be available in a future update."),
          },
          {
            label: "Notifications",
            onClick: () => alert("Notification preferences will be available in a future update."),
          },
        ]}
      />

      <SettingsSection
        title="Account"
        items={[
          {
            label: "Log Out",
            onClick: handleLogout,
            loading: isLoggingOut,
          },
          {
            label: "Delete Account",
            onClick: handleDeleteAccount,
            destructive: true,
            loading: isDeleting,
          },
        ]}
      />

      <SettingsSection
        title="Info"
        items={[
          {
            label: "Help & Support",
            onClick: () => alert("Help center will be available in a future update."),
          },
          {
            label: "Legal",
            onClick: () => alert("Legal information will be available in a future update."),
          },
        ]}
      />
    </div>
  );
}
