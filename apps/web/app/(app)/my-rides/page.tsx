/**
 * My Rides page placeholder (NAV-03).
 * Will show upcoming and past rides in Phase 4.
 */
export default function MyRidesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">My Rides</h1>
      <div className="flex flex-col items-center rounded-2xl border border-border-pastel bg-surface p-12">
        <span className="mb-2 text-4xl">🚗</span>
        <h2 className="mb-2 text-xl font-bold text-text-main">Your Rides</h2>
        <p className="text-sm text-text-secondary">
          Your upcoming and past rides will appear here
        </p>
      </div>
    </div>
  );
}
