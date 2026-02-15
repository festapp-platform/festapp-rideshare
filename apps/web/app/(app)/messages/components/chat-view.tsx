"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  read_at: string | null;
  created_at: string;
}

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  otherUserName: string;
  initialMessages: Message[];
  rideStatus: string;
}

/**
 * Real-time chat interface (CHAT-01, CHAT-02).
 * Subscribes to Postgres Changes for new messages and read receipt updates.
 * Subscribes to Broadcast for typing indicators.
 * Handles optimistic updates with client-side UUID deduplication.
 */
export function ChatView({
  conversationId,
  currentUserId,
  otherUserName,
  initialMessages,
  rideStatus,
}: ChatViewProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(initialMessages.length >= 50);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conversationId}`)
      // New messages via Postgres Changes
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Deduplicate: check if message already exists (optimistic update)
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
            }
            return [...prev, newMsg];
          });

          // Mark as read if from other party and conversation is open
          if (newMsg.sender_id !== currentUserId) {
            supabase.rpc("mark_messages_read", {
              p_conversation_id: conversationId,
            });
          }
        },
      )
      // Read receipt updates
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m)),
          );
        },
      )
      // Typing indicators via Broadcast
      .on("broadcast", { event: "typing" }, (payload) => {
        const data = payload.payload as {
          user_id: string;
          is_typing: boolean;
        };
        if (data.user_id !== currentUserId) {
          setIsOtherTyping(data.is_typing);
          // Auto-clear typing after 3 seconds
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          if (data.is_typing) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsOtherTyping(false);
            }, 3000);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, currentUserId, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Send message with optimistic update
  const handleSendMessage = useCallback(
    async (content: string, messageType: "text" | "phone_share" = "text") => {
      const optimisticId = crypto.randomUUID();
      const optimisticMsg: Message = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
        message_type: messageType,
        read_at: null,
        created_at: new Date().toISOString(),
      };

      // Add optimistically
      setMessages((prev) => [...prev, optimisticMsg]);

      // Send via RPC
      const { error } = await supabase.rpc("send_chat_message", {
        p_conversation_id: conversationId,
        p_content: content,
        p_message_type: messageType,
      });

      if (error) {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        console.error("Failed to send message:", error.message);
      }
    },
    [conversationId, currentUserId, supabase],
  );

  // Broadcast typing indicator
  const handleTyping = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId, is_typing: true },
    });
  }, [currentUserId]);

  const handleStopTyping = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId, is_typing: false },
    });
  }, [currentUserId]);

  // Load older messages on scroll-to-top
  const handleLoadOlder = useCallback(async () => {
    if (isLoadingOlder || !hasMore || messages.length === 0) return;

    setIsLoadingOlder(true);
    const oldestMessage = messages[0];

    const { data: olderMessages } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .lt("created_at", oldestMessage.created_at)
      .order("created_at", { ascending: false })
      .limit(50);

    if (olderMessages && olderMessages.length > 0) {
      setMessages((prev) => [...olderMessages.reverse(), ...prev]);
      setHasMore(olderMessages.length >= 50);
    } else {
      setHasMore(false);
    }

    setIsLoadingOlder(false);
  }, [isLoadingOlder, hasMore, messages, conversationId, supabase]);

  // Handle scroll-to-top for loading older messages
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el && el.scrollTop === 0 && hasMore) {
      handleLoadOlder();
    }
  }, [hasMore, handleLoadOlder]);

  return (
    <>
      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {/* Load more indicator */}
        {hasMore && (
          <div className="mb-4 text-center">
            <button
              onClick={handleLoadOlder}
              disabled={isLoadingOlder}
              className="text-xs text-text-secondary hover:text-primary disabled:opacity-50"
            >
              {isLoadingOlder ? "Loading..." : "Load older messages"}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-secondary">
              Send a message to start the conversation
            </p>
          </div>
        )}

        <div className="space-y-1">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
            />
          ))}
        </div>

        {/* Typing indicator */}
        {isOtherTyping && <TypingIndicator name={otherUserName} />}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
        disabled={rideStatus === "cancelled"}
      />
    </>
  );
}
