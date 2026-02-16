"use client";

import { useState, useCallback } from "react";
import { Share2 } from "lucide-react";
import { SITE_URL } from "@festapp/shared";

interface InviteFriendsProps {
  variant?: "button" | "link";
}

/**
 * Invite friends component using Web Share API with clipboard fallback.
 * Matches the ShareButton pattern from 08-05.
 */
export function InviteFriends({ variant = "button" }: InviteFriendsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: "Join Festapp Rideshare",
      text: "Find shared rides easily. Join me on Festapp Rideshare!",
      url: SITE_URL,
    };

    // Try native Web Share API first (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or API failed -- fall through to clipboard
      }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  if (variant === "link") {
    return (
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-primary"
      >
        <Share2 className="h-4 w-4" />
        {copied ? "Link copied!" : "Invite Friends"}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-primary/90"
    >
      <Share2 className="h-4 w-4" />
      {copied ? "Link copied!" : "Invite Friends"}
    </button>
  );
}
