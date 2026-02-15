import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRouteIntentById, isSubscribed } from "@festapp/shared";
import { createClient } from "@/lib/supabase/server";
import { RouteDetail } from "./route-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Parse a PostGIS point value (WKT or GeoJSON) to lat/lng.
 */
function parsePoint(value: unknown): { lat: number; lng: number } | null {
  if (!value) return null;
  if (typeof value === "string") {
    const match = value.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
    return null;
  }
  if (typeof value === "object" && value !== null && "coordinates" in value) {
    const coords = (value as { coordinates: number[] }).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lng: coords[0], lat: coords[1] };
    }
  }
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: intent } = await getRouteIntentById(supabase, id);

  if (!intent) return { title: "Route Not Found" };

  const title = `${intent.origin_address} -> ${intent.destination_address}`;
  const description = `Flexible route - ${intent.seats_total} seats, ${intent.subscriber_count} subscribers waiting`;

  return {
    title,
    description,
    openGraph: { title, description, url: `/routes/${id}`, type: "website" },
  };
}

export default async function RouteIntentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: intent } = await getRouteIntentById(supabase, id);
  if (!intent) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;
  const isDriver = currentUserId === intent.driver_id;

  // Check subscription status for non-driver visitors
  let isUserSubscribed = false;
  if (currentUserId && !isDriver) {
    const { data: sub } = await isSubscribed(supabase, id, currentUserId);
    isUserSubscribed = !!sub;
  }

  const origin = parsePoint(intent.origin_location);
  const dest = parsePoint(intent.destination_location);

  return (
    <div className="mx-auto max-w-2xl">
      <RouteDetail
        intent={intent}
        isDriver={isDriver}
        currentUserId={currentUserId}
        isUserSubscribed={isUserSubscribed}
        originLat={origin?.lat ?? 50.08}
        originLng={origin?.lng ?? 14.43}
        destLat={dest?.lat ?? 49.19}
        destLng={dest?.lng ?? 16.61}
      />
    </div>
  );
}
