"use client";

import { useState, useCallback } from "react";
import { Share2 } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  /** Optional text label next to the icon */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable share component.
 * Uses Web Share API (navigator.share) on supported platforms (mobile),
 * falls back to clipboard copy with toast notification on desktop.
 */
export function ShareButton({
  title,
  text,
  url,
  label,
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const fullUrl =
      url.startsWith("http") ? url : `${window.location.origin}${url}`;

    // Try native Web Share API first (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: fullUrl });
        return;
      } catch {
        // User cancelled or API failed -- fall through to clipboard
      }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [title, text, url]);

  return (
    <button
      onClick={handleShare}
      className={
        className ??
        "flex items-center gap-1.5 rounded-lg border border-border-pastel px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-primary/5 hover:text-primary"
      }
    >
      <Share2 className="h-3.5 w-3.5" />
      {copied ? "Copied!" : label ?? "Share"}
    </button>
  );
}
