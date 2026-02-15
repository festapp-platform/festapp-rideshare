"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";

interface ConversationProfile {
  display_name: string;
  avatar_url: string | null;
}

interface ConversationRide {
  id: string;
  origin_address: string;
  destination_address: string;
  departure_time: string;
}

interface Conversation {
  id: string;
  booking_id: string;
  ride_id: string;
  driver_id: string;
  passenger_id: string;
  created_at: string;
  rides: ConversationRide | null;
  driver: ConversationProfile | null;
  passenger: ConversationProfile | null;
}

interface ConversationWithMeta extends Conversation {
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
}

/**
 * Client component that renders the list of conversations with real-time updates.
 * Subscribes to Postgres Changes on chat_messages for live last-message and unread updates.
 */
export function ConversationList({
  conversations: initialConversations,
  currentUserId,
}: ConversationListProps) {
  const supabase = createClient();
  const [conversations, setConversations] = useState<ConversationWithMeta[]>(
    () =>
      initialConversations.map((c) => ({
        ...c,
        last_message: null,
        last_message_at: null,
        unread_count: 0,
      })),
  );

  // Fetch last message and unread count for each conversation
  useEffect(() => {
    async function fetchMeta() {
      const convIds = conversations.map((c) => c.id);
      if (convIds.length === 0) return;

      // Get last messages and unread counts
      const updates: Record<
        string,
        { last_message: string; last_message_at: string; unread_count: number }
      > = {};

      await Promise.all(
        convIds.map(async (id) => {
          const [{ data: lastMsg }, { data: unreadMsgs }] = await Promise.all([
            supabase
              .from("chat_messages")
              .select("content, created_at")
              .eq("conversation_id", id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("chat_messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", id)
              .neq("sender_id", currentUserId)
              .is("read_at", null),
          ]);

          updates[id] = {
            last_message: lastMsg?.content ?? "",
            last_message_at: lastMsg?.created_at ?? "",
            unread_count: unreadMsgs?.length ?? 0,
          };
        }),
      );

      setConversations((prev) =>
        prev
          .map((c) =>
            updates[c.id]
              ? {
                  ...c,
                  last_message: updates[c.id].last_message,
                  last_message_at: updates[c.id].last_message_at,
                  unread_count: updates[c.id].unread_count,
                }
              : c,
          )
          .sort((a, b) => {
            const aTime = a.last_message_at || a.created_at;
            const bTime = b.last_message_at || b.created_at;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          }),
      );
    }

    fetchMeta();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to new messages across all conversations for real-time updates
  useEffect(() => {
    const convIds = new Set(conversations.map((c) => c.id));

    const channel = supabase
      .channel("conversation-list")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const msg = payload.new as {
            conversation_id: string;
            sender_id: string;
            content: string;
            created_at: string;
          };

          if (!convIds.has(msg.conversation_id)) return;

          setConversations((prev) =>
            prev
              .map((c) => {
                if (c.id !== msg.conversation_id) return c;
                return {
                  ...c,
                  last_message: msg.content,
                  last_message_at: msg.created_at,
                  unread_count:
                    msg.sender_id !== currentUserId
                      ? c.unread_count + 1
                      : c.unread_count,
                };
              })
              .sort((a, b) => {
                const aTime = a.last_message_at || a.created_at;
                const bTime = b.last_message_at || b.created_at;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
              }),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      {conversations.map((conv) => {
        const otherParty =
          conv.driver_id === currentUserId ? conv.passenger : conv.driver;
        const ride = conv.rides;
        const preview = conv.last_message
          ? conv.last_message.length > 60
            ? conv.last_message.slice(0, 60) + "..."
            : conv.last_message
          : "No messages yet";
        const timeAgo = conv.last_message_at
          ? formatDistanceToNow(new Date(conv.last_message_at), {
              addSuffix: true,
            })
          : formatDistanceToNow(new Date(conv.created_at), {
              addSuffix: true,
            });

        return (
          <Link
            key={conv.id}
            href={`/messages/${conv.id}`}
            className="flex items-center gap-3 rounded-2xl border border-border-pastel bg-surface p-4 transition-colors hover:bg-primary/5"
          >
            {/* Avatar */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
              {otherParty?.avatar_url ? (
                <img
                  src={otherParty.avatar_url}
                  alt={otherParty.display_name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                (otherParty?.display_name ?? "?").charAt(0).toUpperCase()
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`truncate font-semibold ${
                    conv.unread_count > 0
                      ? "text-text-main"
                      : "text-text-main"
                  }`}
                >
                  {otherParty?.display_name ?? "Unknown"}
                </p>
                <span className="flex-shrink-0 text-xs text-text-secondary">
                  {timeAgo}
                </span>
              </div>
              {ride && (
                <p className="truncate text-xs text-text-secondary">
                  {ride.origin_address} → {ride.destination_address}
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`truncate text-sm ${
                    conv.unread_count > 0
                      ? "font-medium text-text-main"
                      : "text-text-secondary"
                  }`}
                >
                  {preview}
                </p>
                {conv.unread_count > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
