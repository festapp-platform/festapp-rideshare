"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface ContactShareButtonProps {
  conversationId: string;
  onSendMessage: (content: string, messageType: "text" | "phone_share") => void;
}

/**
 * Button that shares the current user's phone number in chat (CHAT-03).
 * Fetches the user's phone from their profile and sends as phone_share message.
 */
export function ContactShareButton({
  conversationId,
  onSendMessage,
}: ContactShareButtonProps) {
  const supabase = createClient();
  const [isSharing, setIsSharing] = useState(false);

  async function handleShare() {
    setIsSharing(true);
    try {
      // Get current user's profile with phone number
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .single();

      if (!profile?.phone) {
        toast.error("Add your phone number in Profile settings first");
        return;
      }

      onSendMessage(profile.phone, "phone_share");
      toast.success("Phone number shared");
    } catch {
      toast.error("Failed to share phone number");
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className="flex items-center gap-1.5 rounded-lg border border-border-pastel bg-surface px-3 py-1.5 text-xs font-medium text-text-main transition-colors hover:bg-primary/5 disabled:opacity-50"
      title="Share your phone number"
    >
      <svg
        className="h-4 w-4 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
      {isSharing ? "Sharing..." : "Share Number"}
    </button>
  );
}
