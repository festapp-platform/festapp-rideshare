import { ChatInterface } from "./components/chat-interface";

export const metadata = {
  title: "AI Asistent",
};

/**
 * AI Assistant page — /assistant route.
 * Renders the chat interface for natural language ride operations.
 */
export default function AssistantPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:h-screen">
      <ChatInterface />
    </div>
  );
}
