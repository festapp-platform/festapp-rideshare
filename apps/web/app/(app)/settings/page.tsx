"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/lib/i18n/use-translations";
import { SITE_URL } from "@festapp/shared";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/confirm-dialog";

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
  const { t } = useTranslations();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleInviteFriends = async () => {
    const shareData = {
      title: "Join Festapp Rideshare",
      text: "Find shared rides easily. Join me on Festapp Rideshare!",
      url: SITE_URL,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed -- fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(SITE_URL);
      toast.success("Link copied to clipboard!");
    } catch {
      // Clipboard not available
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Failed to log out. Please try again.");
        setIsLoggingOut(false);
        return;
      }
      router.replace("/login");
    } catch {
      toast.error("An unexpected error occurred.");
      setIsLoggingOut(false);
    }
  };

  const deleteAccount = async () => {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) {
        toast.error("Failed to delete account. Please try again.");
        setIsDeleting(false);
        return;
      }
      // Sign out after successful deletion
      await supabase.auth.signOut();
      router.replace("/login");
    } catch {
      toast.error("An unexpected error occurred.");
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteDialog(true);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">
        {t("nav.settings")}
      </h1>

      <SettingsSection
        title={t("settings.preferences")}
        items={[
          {
            label: t("settings.language"),
            onClick: () => router.push("/settings/language"),
          },
          {
            label: t("settings.notifications"),
            onClick: () => router.push("/settings/notifications"),
          },
        ]}
      />

      <SettingsSection
        title={t("settings.privacy")}
        items={[
          {
            label: t("settings.blockedUsers"),
            onClick: () => router.push("/settings/blocked-users"),
          },
          {
            label: "Export My Data",
            onClick: () => router.push("/settings/data-export"),
          },
        ]}
      />

      <SettingsSection
        title={t("settings.account")}
        items={[
          {
            label: t("auth.logout"),
            onClick: handleLogout,
            loading: isLoggingOut,
          },
          {
            label: t("auth.deleteAccount"),
            onClick: handleDeleteAccount,
            destructive: true,
            loading: isDeleting,
          },
        ]}
      />

      <SettingsSection
        title={t("settings.info")}
        items={[
          {
            label: t("settings.help"),
            onClick: () => router.push("/help"),
          },
          {
            label: t("settings.legal"),
            onClick: () => router.push("/terms"),
          },
          {
            label: "Invite Friends",
            onClick: handleInviteFriends,
          },
          {
            label: "Support Us",
            onClick: () => router.push("/donate"),
          },
        ]}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => {
          setShowDeleteDialog(false);
          deleteAccount();
        }}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently removed."
        confirmLabel="Delete Account"
        cancelLabel="Cancel"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
