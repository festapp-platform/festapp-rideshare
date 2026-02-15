import { createClient } from "@/lib/supabase/server";
import { getEventById, getEventRides } from "@festapp/shared";
import { notFound } from "next/navigation";
import { EventDetail } from "./event-detail";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [eventResult, ridesResult, userResult] = await Promise.all([
    getEventById(supabase, id),
    getEventRides(supabase, id),
    supabase.auth.getUser(),
  ]);

  if (!eventResult.data) {
    notFound();
  }

  return (
    <EventDetail
      event={eventResult.data}
      rides={ridesResult.data ?? []}
      currentUserId={userResult.data.user?.id ?? null}
    />
  );
}
