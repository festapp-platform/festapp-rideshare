"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ChatInputProps {
  onSendMessage: (content: string, messageType?: "text" | "phone_share") => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
}

/**
 * Chat input with typing indicator broadcasting (CHAT-01, CHAT-02).
 * Enter sends, Shift+Enter inserts newline.
 * Broadcasts typing indicators with 500ms debounce and 3s auto-clear.
 */
export function ChatInput({
  onSendMessage,
  onTyping,
  onStopTyping,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const typingActiveRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [message]);

  const handleTypingDebounce = useCallback(() => {
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      onTyping();
    }

    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    typingDebounceRef.current = setTimeout(() => {
      typingActiveRef.current = false;
      onStopTyping();
    }, 3000);
  }, [onTyping, onStopTyping]);

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
    setMessage("");

    // Clear typing indicator
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }
    typingActiveRef.current = false;
    onStopTyping();
  }, [message, onSendMessage, onStopTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Cleanup typing debounce on unmount
  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
    };
  }, []);

  if (disabled) {
    return (
      <div className="border-t border-border-pastel bg-surface px-4 py-3">
        <p className="text-center text-sm text-text-secondary">
          This conversation is no longer active
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border-pastel bg-surface px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTypingDebounce();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border-pastel bg-background px-4 py-2.5 text-sm text-text-main placeholder:text-text-secondary/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
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
              d="M12 19V5m0 0l-7 7m7-7l7 7"
              transform="rotate(45 12 12)"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
