/**
 * Search page placeholder (NAV-02).
 * Default landing screen after auth. Will contain ride search in Phase 3.
 */
export default function SearchPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Search</h1>
      <div className="rounded-2xl border border-border-pastel bg-surface p-6">
        <div className="mb-4 flex h-12 w-full items-center rounded-xl border border-border-pastel px-4">
          <span className="text-text-secondary">Where are you going?</span>
        </div>
        <p className="text-center text-sm text-text-secondary">
          Search for rides to festivals, events, and more
        </p>
      </div>
    </div>
  );
}
