import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEventById } from "@festapp/shared";
import { RideForm } from "../../components/ride-form";

export const metadata = {
  title: "Post a Ride",
  description: "Post a ride and find passengers for your trip.",
};

interface NewRidePageProps {
  searchParams: Promise<{ eventId?: string }>;
}

/**
 * Ride posting page at /rides/new.
 * Server component that checks auth and renders the client-side RideForm.
 * Supports optional ?eventId= param to pre-link ride to an event.
 */
export default async function NewRidePage({ searchParams }: NewRidePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { eventId } = await searchParams;

  // If eventId provided, fetch event details for pre-fill
  let linkedEvent: { id: string; name: string; location_address: string; location_lat: number; location_lng: number } | null = null;
  if (eventId) {
    const { data: event } = await getEventById(supabase, eventId);
    if (event && event.status === "approved") {
      // Parse location WKT to get coordinates - location is stored as POINT(lng lat)
      let lat = 0;
      let lng = 0;
      const locStr = String(event.location ?? "");
      const match = locStr.match(/POINT\(([^ ]+) ([^ ]+)\)/);
      if (match) {
        lng = parseFloat(match[1]!);
        lat = parseFloat(match[2]!);
      }
      linkedEvent = {
        id: event.id,
        name: event.name,
        location_address: event.location_address,
        location_lat: lat,
        location_lng: lng,
      };
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Post a Ride</h1>
      {linkedEvent && (
        <div className="mb-4 rounded-lg bg-primary/5 p-3 text-sm text-text-secondary">
          Linking ride to event: <span className="font-medium text-text-main">{linkedEvent.name}</span>
        </div>
      )}
      <RideForm linkedEvent={linkedEvent} />
    </div>
  );
}
