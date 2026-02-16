import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getRideByShortId } from "@/lib/short-id";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, formatPrice } from "@festapp/shared";
import { PublicRideContent } from "./public-ride-content";

interface PageProps {
  params: Promise<{ shortId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { shortId } = await params;
  const supabase = await createClient();
  const { data: ride } = await getRideByShortId(supabase, shortId);

  if (!ride) {
    return { title: "Ride Not Found | spolujizda.online" };
  }

  const departureDate = parseISO(ride.departure_time);
  const formattedDate = format(departureDate, "MMM d, yyyy 'at' h:mm a");
  const title = `${ride.origin_address} -> ${ride.destination_address} | ${SITE_NAME}`;
  const description = `${formatPrice(ride.price_czk)}, ${ride.seats_available} ${ride.seats_available === 1 ? "seat" : "seats"} available, ${formattedDate}`;
  const url = `${SITE_URL}/ride/${shortId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function PublicRidePage({ params }: PageProps) {
  const { shortId } = await params;
  const supabase = await createClient();
  const { data: ride } = await getRideByShortId(supabase, shortId);

  if (!ride) {
    notFound();
  }

  const departureDate = parseISO(ride.departure_time);
  const formattedDate = format(departureDate, "EEEE, MMM d, yyyy");
  const formattedTime = format(departureDate, "h:mm a");

  return (
    <PublicRideContent
      ride={ride}
      formattedDate={formattedDate}
      formattedTime={formattedTime}
    />
  );
}
