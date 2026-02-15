import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getMessages } from "@festapp/shared";
import { createClient } from "@/lib/supabase/server";
import { ChatView } from "../components/chat-view";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

/**
 * Chat detail page - shows real-time messages for a conversation (CHAT-01, CHAT-02).
 * Server component that verifies participation, fetches initial messages, marks as read.
 */
export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch conversation details and verify user is a participant
  const { data: conversation, error: convError } = await supabase
    .from("chat_conversations")
    .select(
      `
      *,
      rides:ride_id(id, origin_address, destination_address, departure_time, status),
      driver:profiles!chat_conversations_driver_id_fkey(id, display_name, avatar_url, phone),
      passenger:profiles!chat_conversations_passenger_id_fkey(id, display_name, avatar_url, phone)
    `,
    )
    .eq("id", conversationId)
    .single();

  if (convError || !conversation) {
    notFound();
  }

  // Verify current user is a participant
  const isParticipant =
    conversation.driver_id === user.id ||
    conversation.passenger_id === user.id;
  if (!isParticipant) {
    notFound();
  }

  // Fetch initial messages (last 50, newest first)
  const { data: messages } = await getMessages(supabase, conversationId, 50);

  // Mark existing messages as read (server-side)
  await supabase.rpc("mark_messages_read", {
    p_conversation_id: conversationId,
  });

  // Determine other party
  const isDriver = conversation.driver_id === user.id;
  const otherParty = isDriver
    ? (conversation.passenger as { id: string; display_name: string; avatar_url: string | null; phone: string | null })
    : (conversation.driver as { id: string; display_name: string; avatar_url: string | null; phone: string | null });
  const ride = conversation.rides as {
    id: string;
    origin_address: string;
    destination_address: string;
    departure_time: string;
    status: string;
  } | null;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col md:h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-pastel bg-surface px-4 py-3">
        <Link
          href="/messages"
          className="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-primary/5"
        >
          <svg
            className="h-5 w-5 text-text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {otherParty?.avatar_url ? (
            <img
              src={otherParty.avatar_url}
              alt={otherParty.display_name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            (otherParty?.display_name ?? "?").charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text-main">
            {otherParty?.display_name ?? "Unknown"}
          </p>
          {ride && (
            <p className="truncate text-xs text-text-secondary">
              {ride.origin_address} → {ride.destination_address}
            </p>
          )}
        </div>
      </div>

      {/* Chat */}
      <ChatView
        conversationId={conversationId}
        currentUserId={user.id}
        otherUserName={otherParty?.display_name ?? "Unknown"}
        initialMessages={(messages ?? []).reverse()}
        rideStatus={ride?.status ?? "upcoming"}
      />
    </div>
  );
}
