import { createClient } from "@/lib/supabase/server";
import { getApprovedEvents } from "@festapp/shared";
import { EventsClient } from "./events-client";

export const metadata = {
  title: "Events",
  description: "Browse upcoming events with shared rides.",
};

/**
 * Events browsing page at /events.
 * Server component fetching approved events, rendered by client component for search/filter.
 */
export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await getApprovedEvents(supabase);

  return <EventsClient events={events ?? []} />;
}
