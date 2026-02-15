import Link from "next/link";
import { getActiveRouteIntents, ROUTE_INTENT_STATUS } from "@festapp/shared";
import { createClient } from "@/lib/supabase/server";
import { RouteIntentList } from "./route-intent-list";

export const metadata = {
  title: "Route Intents",
  description: "Browse flexible routes - subscribe to be notified when a driver confirms a departure date.",
};

/**
 * Routes browsing page at /routes.
 * Server component fetching active route intents.
 */
export default async function RoutesPage() {
  const supabase = await createClient();
  const { data: intents } = await getActiveRouteIntents(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Routes</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Subscribe to a route and get notified when a driver sets a departure date
          </p>
        </div>
        {user && (
          <Link
            href="/routes/new"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-primary/90"
          >
            Post a Route
          </Link>
        )}
      </div>

      <RouteIntentList intents={intents ?? []} />
    </div>
  );
}
