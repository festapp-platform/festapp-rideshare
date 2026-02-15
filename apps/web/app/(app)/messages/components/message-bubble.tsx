"use client";

import { useState } from "react";
import { format } from "date-fns";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  read_at: string | null;
  created_at: string;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

/**
 * Single message bubble component (CHAT-02, CHAT-03).
 * Handles text messages and phone_share messages with different rendering.
 * Shows read receipts on sent messages.
 */
export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const time = format(new Date(message.created_at), "h:mm a");

  // Phone share message rendering
  if (message.message_type === "phone_share") {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
        <div
          className={`max-w-xs rounded-2xl border p-4 ${
            isOwn
              ? "border-primary/20 bg-primary/5"
              : "border-border-pastel bg-surface"
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-primary"
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
            <span className="text-xs font-medium text-text-secondary">
              {isOwn ? "You shared your number" : "Shared phone number"}
            </span>
          </div>
          <p className="mb-3 text-lg font-bold text-text-main">
            {message.content}
          </p>
          <div className="flex gap-2">
            <a
              href={`tel:${message.content}`}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Call
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex-1 rounded-lg border border-border-pastel bg-surface px-3 py-2 text-center text-sm font-medium text-text-main transition-colors hover:bg-primary/5"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-end gap-1">
            <span className="text-[10px] text-text-secondary">{time}</span>
            {isOwn && <ReadReceipt isRead={!!message.read_at} />}
          </div>
        </div>
      </div>
    );
  }

  // Standard text message
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isOwn
            ? "bg-primary text-white"
            : "bg-surface border border-border-pastel text-text-main"
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm">
          {message.content}
        </p>
        <div
          className={`mt-1 flex items-center justify-end gap-1 ${
            isOwn ? "text-white/60" : "text-text-secondary"
          }`}
        >
          <span className="text-[10px]">{time}</span>
          {isOwn && (
            <ReadReceipt
              isRead={!!message.read_at}
              light={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Read receipt indicator - single check (sent) or double check (read). */
function ReadReceipt({
  isRead,
  light = false,
}: {
  isRead: boolean;
  light?: boolean;
}) {
  const color = light
    ? isRead
      ? "text-white/80"
      : "text-white/40"
    : isRead
      ? "text-primary"
      : "text-text-secondary/50";

  return (
    <svg
      className={`h-3.5 w-3.5 ${color}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      {isRead ? (
        // Double check
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 12l5 5L20 6"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l5 5L25 6"
            opacity={0.6}
          />
        </>
      ) : (
        // Single check
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      )}
    </svg>
  );
}
