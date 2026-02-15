"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SocialLinks } from "@festapp/shared";

interface PublicProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: SocialLinks | null;
  id_verified: boolean;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  photo_url: string | null;
}

export default function PublicProfilePage() {
  const params = useParams();
  const profileId = params.id as string;
  const supabase = createClient();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [primaryVehicle, setPrimaryVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchProfile = useCallback(async () => {
    const [profileResult, phoneResult, vehicleResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, bio, avatar_url, social_links, id_verified, rating_avg, rating_count, created_at")
        .eq("id", profileId)
        .single(),
      supabase.rpc("is_phone_verified", { user_id: profileId }),
      supabase
        .from("vehicles")
        .select("id, make, model, photo_url")
        .eq("owner_id", profileId)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);

    if (profileResult.error || !profileResult.data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProfile(profileResult.data);
    setPhoneVerified(phoneResult.data === true);
    setPrimaryVehicle(vehicleResult.data || null);
    setLoading(false);
  }, [supabase, profileId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-text-main">Profile</h1>
        <div className="mb-6 flex animate-pulse flex-col items-center rounded-2xl border border-border-pastel bg-surface p-8">
          <div className="mb-4 h-24 w-24 rounded-full bg-border-pastel" />
          <div className="mb-2 h-6 w-40 rounded bg-border-pastel" />
          <div className="h-4 w-56 rounded bg-border-pastel" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center py-16">
        <svg className="mb-4 h-16 w-16 text-text-secondary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h2 className="mb-2 text-xl font-bold text-text-main">Profile Not Found</h2>
        <p className="mb-4 text-sm text-text-secondary">This user profile does not exist or has been removed.</p>
        <Link href="/" className="text-sm font-medium text-primary hover:text-primary/80">
          Go home
        </Link>
      </div>
    );
  }

  const socialLinks = profile?.social_links as SocialLinks | null;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Profile</h1>

      {/* Profile card */}
      <div className="mb-6 rounded-2xl border border-border-pastel bg-surface p-8">
        <div className="flex flex-col items-center">
          {/* Avatar */}
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name || "User avatar"}
              className="mb-4 h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary-light">
              <svg
                className="h-12 w-12 text-surface"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          )}

          {/* Display name */}
          <h2 className="text-xl font-bold text-text-main">
            {profile?.display_name || "User"}
          </h2>

          {/* Verification badges */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {phoneVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Phone Verified
              </span>
            )}
            {profile?.id_verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                ID Verified
              </span>
            )}
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="mt-3 max-w-md text-center text-sm text-text-secondary">
              {profile.bio}
            </p>
          )}

          {/* Social links */}
          {(socialLinks?.instagram || socialLinks?.facebook) && (
            <div className="mt-3 flex items-center gap-3">
              {socialLinks?.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary transition-colors hover:text-pink-600"
                  title="Instagram"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              {socialLinks?.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary transition-colors hover:text-blue-600"
                  title="Facebook"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* Member since */}
          {memberSince && (
            <p className="mt-3 text-xs text-text-secondary">
              Member since {memberSince}
            </p>
          )}
        </div>
      </div>

      {/* Primary vehicle */}
      {primaryVehicle && (
        <div className="mb-4 rounded-2xl border border-border-pastel bg-surface p-6">
          <h3 className="mb-3 text-sm font-semibold text-text-main">Vehicle</h3>
          <div className="flex items-center gap-3">
            {primaryVehicle.photo_url ? (
              <img
                src={primaryVehicle.photo_url}
                alt={`${primaryVehicle.make} ${primaryVehicle.model}`}
                className="h-12 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-border-pastel">
                <svg className="h-6 w-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h.386c.26 0 .516-.069.74-.2l2.598-1.52a1.125 1.125 0 01.57-.154h6.662a1.125 1.125 0 01.95.523l1.51 2.397a1.125 1.125 0 00.95.523h1.284a.75.75 0 00.75-.75v-2.25a.75.75 0 00-.167-.472l-2.478-3.097a1.125 1.125 0 00-.878-.426H8.25a1.125 1.125 0 00-.878.426L4.894 12.3a.75.75 0 00-.167.472v1.478z" />
                </svg>
              </div>
            )}
            <p className="text-sm font-medium text-text-main">
              {primaryVehicle.make} {primaryVehicle.model}
            </p>
          </div>
        </div>
      )}

      {/* Ratings section */}
      <div className="mb-4 rounded-2xl border border-border-pastel bg-surface p-6">
        <h3 className="mb-3 text-sm font-semibold text-text-main">Ratings</h3>
        {profile && profile.rating_count > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-5 w-5 ${
                    star <= Math.round(profile.rating_avg || 0)
                      ? "text-yellow-400"
                      : "text-border-pastel"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-text-secondary">
              {(profile.rating_avg || 0).toFixed(1)} ({profile.rating_count} {profile.rating_count === 1 ? "rating" : "ratings"})
            </span>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No ratings yet</p>
        )}
      </div>
    </div>
  );
}
