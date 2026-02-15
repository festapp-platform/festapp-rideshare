"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Real-time unread message count badge for navigation (CHAT-01).
 * Fetches initial count via get_unread_count RPC, then subscribes to
 * Postgres Changes on chat_messages for real-time updates.
 */
export function UnreadBadge() {
  const supabase = createClient();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let userId: string | null = null;

    // Fetch initial count
    async function fetchCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      const { data } = await supabase.rpc("get_unread_count");
      if (typeof data === "number") {
        setCount(data);
      }
    }

    fetchCount();

    // Subscribe to new messages for real-time count updates
    const channel = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const msg = payload.new as { sender_id: string };
          // Increment count when a new message arrives from someone else
          if (userId && msg.sender_id !== userId) {
            setCount((prev) => prev + 1);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const oldMsg = payload.old as { read_at: string | null };
          const newMsg = payload.new as { read_at: string | null; sender_id: string };
          // Decrement when a message is marked as read (read_at goes from null to a value)
          if (!oldMsg.read_at && newMsg.read_at && userId && newMsg.sender_id !== userId) {
            setCount((prev) => Math.max(0, prev - 1));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (count === 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
