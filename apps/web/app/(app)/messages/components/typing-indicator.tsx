"use client";

interface TypingIndicatorProps {
  name: string;
}

/**
 * Animated typing indicator shown when another user is typing (CHAT-02).
 * Shows bouncing dots with the user's name.
 */
export function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <div className="flex items-center gap-1 rounded-2xl border border-border-pastel bg-surface px-4 py-2">
        <div className="flex items-center gap-0.5">
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary/50"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary/50"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary/50"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <span className="ml-1 text-xs text-text-secondary">
          {name} is typing...
        </span>
      </div>
    </div>
  );
}
