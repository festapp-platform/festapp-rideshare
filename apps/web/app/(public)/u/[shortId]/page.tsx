import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileByShortId } from "@/lib/short-id";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@festapp/shared";

interface PageProps {
  params: Promise<{ shortId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { shortId } = await params;
  const supabase = await createClient();
  const { data: profile } = await getProfileByShortId(supabase, shortId);

  if (!profile) {
    return { title: "Profile Not Found | spolujizda.online" };
  }

  const title = `${profile.display_name} | ${SITE_NAME}`;
  const description = profile.bio
    ? profile.bio.slice(0, 160)
    : `${profile.display_name} on spolujizda.online`;
  const url = `${SITE_URL}/u/${shortId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "profile",
      images: [
        {
          url: profile.avatar_url || `${SITE_URL}${DEFAULT_OG_IMAGE}`,
          width: 1200,
          height: 630,
          alt: profile.display_name,
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { shortId } = await params;
  const supabase = await createClient();
  const { data: profile } = await getProfileByShortId(supabase, shortId);

  if (!profile) {
    notFound();
  }

  const ratingCount = profile.rating_count ?? 0;
  const ratingAvg = profile.rating_avg ?? 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Avatar and name */}
      <div className="mb-6 text-center">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="mx-auto mb-4 h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-3xl font-medium text-gray-600">
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900">
          {profile.display_name}
        </h1>

        {/* Badges */}
        <div className="mt-2 flex items-center justify-center gap-2">
          {profile.id_verified && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              ID Verified
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 capitalize">
            {profile.user_role}
          </span>
        </div>
      </div>

      {/* Rating */}
      <div className="mb-6 rounded-lg border bg-white p-4 text-center">
        {ratingCount > 0 ? (
          <div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold text-gray-900">
                {Number(ratingAvg).toFixed(1)}
              </span>
              <span className="text-yellow-500 text-xl">&#9733;</span>
            </div>
            <p className="text-sm text-gray-500">
              {ratingCount} {ratingCount === 1 ? "review" : "reviews"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No reviews yet</p>
        )}
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="mb-6 rounded-lg border bg-white p-4">
          <p className="mb-1 text-sm font-medium text-gray-700">About</p>
          <p className="text-sm text-gray-600">{profile.bio}</p>
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/profile/${profile.id}`}
        className="block w-full rounded-lg bg-gray-900 py-3 text-center font-medium text-white hover:bg-gray-800 transition-colors"
      >
        View full profile
      </Link>
    </div>
  );
}
