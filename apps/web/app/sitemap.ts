import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@festapp/shared";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Fetch recent active/completed rides with short_ids
  const { data: rides } = await supabase
    .from("rides")
    .select("short_id, updated_at")
    .in("status", ["upcoming", "completed"])
    .order("departure_time", { ascending: false })
    .limit(1000);

  const rideEntries: MetadataRoute.Sitemap = (rides ?? []).map((ride) => ({
    url: `${SITE_URL}/ride/${ride.short_id}`,
    lastModified: new Date(ride.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Static pages
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/search`,
      changeFrequency: "weekly" as const,
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/community`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/events`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
  ];

  return [...staticEntries, ...rideEntries];
}
