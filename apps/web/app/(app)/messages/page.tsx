import { redirect } from "next/navigation";
import { getConversationsForUser } from "@festapp/shared";
import { createClient } from "@/lib/supabase/server";
import { ConversationList } from "./components/conversation-list";

/**
 * Messages page - shows list of user's chat conversations (CHAT-01).
 * Server component that fetches conversations and passes to client component.
 */
export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: conversations } = await getConversationsForUser(
    supabase,
    user.id,
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Messages</h1>
      {conversations && conversations.length > 0 ? (
        <ConversationList
          conversations={conversations}
          currentUserId={user.id}
        />
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-border-pastel bg-surface p-12">
          <svg
            className="mb-3 h-12 w-12 text-text-secondary/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h2 className="mb-2 text-xl font-bold text-text-main">
            No messages yet
          </h2>
          <p className="text-sm text-text-secondary">
            Book a ride to start chatting with the driver
          </p>
        </div>
      )}
    </div>
  );
}
