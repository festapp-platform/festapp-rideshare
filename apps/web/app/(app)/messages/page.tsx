/**
 * Messages page placeholder (NAV-04).
 * Will contain real-time conversations in Phase 5.
 */
export default function MessagesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Messages</h1>
      <div className="flex flex-col items-center rounded-2xl border border-border-pastel bg-surface p-12">
        <span className="mb-2 text-4xl">💬</span>
        <h2 className="mb-2 text-xl font-bold text-text-main">Messages</h2>
        <p className="text-sm text-text-secondary">
          Your conversations will appear here
        </p>
      </div>
    </div>
  );
}
