"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAiAssistant } from "../../hooks/use-ai-assistant";
import { VoiceInput } from "./voice-input";
import { IntentConfirmation } from "./intent-confirmation";

/** Language config for voice recognition. */
const VOICE_LANGS: Record<string, string> = {
  cs: "cs-CZ",
  sk: "sk-SK",
  en: "en-US",
};

/**
 * AI Assistant chat interface with message history, text input, voice input,
 * and inline intent confirmation cards.
 *
 * - User messages appear right-aligned (blue bubbles)
 * - Assistant messages appear left-aligned (gray bubbles)
 * - Pending confirmations show IntentConfirmation card inline
 * - Voice input sends transcript and auto-submits
 * - Auto-scrolls to bottom on new messages
 */
export function ChatInterface() {
  const {
    messages,
    isLoading,
    isExecuting,
    pendingConfirmation,
    sendMessage,
    confirmAction,
    rejectAction,
    clearHistory,
  } = useAiAssistant();

  const [input, setInput] = useState("");
  const [voiceLang, setVoiceLang] = useState("cs");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pendingConfirmation]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput("");
    // Re-focus input
    inputRef.current?.focus();
  }, [input, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Voice transcript: set input and auto-submit
  const handleTranscript = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [input]);

  return (
    <div className="flex h-full flex-col">
      {/* Header with language selector and clear button */}
      <div className="flex items-center justify-between border-b border-border-pastel bg-surface px-4 py-2">
        <div className="flex items-center gap-2">
          <select
            value={voiceLang}
            onChange={(e) => setVoiceLang(e.target.value)}
            className="rounded-lg border border-border-pastel bg-white px-2 py-1 text-xs text-text-secondary focus:border-primary focus:outline-none"
            title="Voice language"
          >
            <option value="cs">CS</option>
            <option value="sk">SK</option>
            <option value="en">EN</option>
          </select>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-text-secondary hover:text-red-500 transition-colors"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm text-center">
              <div className="mb-4 text-4xl">
                <svg className="mx-auto h-12 w-12 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <p className="mb-2 text-sm font-medium text-text-main">
                Ahoj! Jsem tvuj asistent pro spolujizdy.
              </p>
              <p className="mb-4 text-xs text-text-secondary">
                Napis mi co potrebujes, nebo pouzij mikrofon.
              </p>
              <div className="space-y-1.5 text-xs text-text-secondary">
                <p className="italic">&quot;Vytvor jizdu z Prahy do Brna zitra v 8:00&quot;</p>
                <p className="italic">&quot;Najdi mi jizdu do Ostravy&quot;</p>
                <p className="italic">&quot;Book a seat on ride...&quot;</p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-md"
                    : "bg-gray-100 text-text-main rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Pending confirmation card */}
          {pendingConfirmation && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <IntentConfirmation
                  intent={pendingConfirmation}
                  onConfirm={confirmAction}
                  onReject={rejectAction}
                  isExecuting={isExecuting}
                />
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border-pastel bg-surface px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napis zpravu..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-border-pastel bg-background px-4 py-2.5 text-sm text-text-main placeholder:text-text-secondary/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <VoiceInput
            onTranscript={handleTranscript}
            lang={VOICE_LANGS[voiceLang] ?? "cs-CZ"}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
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
    </div>
  );
}
