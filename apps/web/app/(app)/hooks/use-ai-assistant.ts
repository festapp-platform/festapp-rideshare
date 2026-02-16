"use client";

import { useState, useCallback } from "react";
import { sendAiMessage, executeAiAction } from "../assistant/actions";

interface AiIntent {
  action: string;
  confidence: number;
  language: string;
  params: Record<string, unknown>;
  display_text: string;
  needs_confirmation: boolean;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: AiIntent | null;
  confirmed?: boolean;
}

/**
 * React hook managing AI assistant chat state with confirmation flow.
 *
 * - Sends messages to AI Edge Function via server action
 * - Manages conversation history (last 10 messages for context)
 * - Handles confirmation/rejection flow for mutation intents
 * - Tracks loading and pending confirmation state
 */
export function useAiAssistant() {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<AiIntent | null>(null);

  /**
   * Send a text message to the AI assistant.
   * Adds user message to history, calls the server action,
   * and processes the response (intent or conversational reply).
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: AiChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Build conversation history from last 10 messages (role + content only)
        const history = [...messages, userMessage]
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await sendAiMessage(text.trim(), history);

        if (response.error) {
          const errorMessage: AiChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: response.error,
          };
          setMessages((prev) => [...prev, errorMessage]);
          return;
        }

        const assistantMessage: AiChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.reply,
          intent: response.intent,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // If intent requires confirmation, set pending
        if (response.intent?.needs_confirmation) {
          setPendingConfirmation(response.intent);
        }
      } catch {
        const errorMessage: AiChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading],
  );

  /**
   * Confirm the pending action — executes the mutation via server action.
   */
  const confirmAction = useCallback(async () => {
    if (!pendingConfirmation) return;

    setIsExecuting(true);

    try {
      const result = await executeAiAction(
        pendingConfirmation.action,
        pendingConfirmation.params,
      );

      const resultMessage: AiChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.success
          ? "Done! The action was completed successfully."
          : `Error: ${result.error || "Action failed"}`,
      };

      // Mark the intent message as confirmed
      setMessages((prev) => {
        const updated = [...prev];
        const intentIdx = updated.findLastIndex(
          (m) => m.intent?.action === pendingConfirmation.action,
        );
        if (intentIdx >= 0) {
          updated[intentIdx] = { ...updated[intentIdx], confirmed: true };
        }
        return [...updated, resultMessage];
      });
    } catch {
      const errorMessage: AiChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Failed to execute the action. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setPendingConfirmation(null);
      setIsExecuting(false);
    }
  }, [pendingConfirmation]);

  /**
   * Reject the pending action — dismiss without executing.
   */
  const rejectAction = useCallback(() => {
    setPendingConfirmation(null);

    const cancelMessage: AiChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Action cancelled.",
    };
    setMessages((prev) => [...prev, cancelMessage]);
  }, []);

  /**
   * Clear all conversation history.
   */
  const clearHistory = useCallback(() => {
    setMessages([]);
    setPendingConfirmation(null);
  }, []);

  return {
    messages,
    isLoading,
    isExecuting,
    pendingConfirmation,
    sendMessage,
    confirmAction,
    rejectAction,
    clearHistory,
  };
}
