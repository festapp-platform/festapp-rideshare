"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SocialLinks, PendingReview } from "@festapp/shared";
import { StarRating } from "../../components/star-rating";
import { ExperiencedBadge } from "../../components/experienced-badge";
import { ReviewList } from "../../components/review-list";
import { RatingModal } from "../../components/rating-modal";
import { ReportDialog } from "../../components/report-dialog";
import { BlockButton } from "../../components/block-button";
import { LevelBadge } from "../components/level-badge";
import { BadgesSection } from "../components/badges-section";

interface PublicProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: SocialLinks | null;
  id_verified: boolean;
  rating_avg: number | null;
  rating_count: number;
  account_status: string | null;
  suspended_until: string | null;
  completed_rides_count: number;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [ratingModalReview, setRatingModalReview] = useState<PendingReview | null>(null);
  const [reviewListKey, setReviewListKey] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const fetchProfile = useCallback(async () => {
    const [profileResult, phoneResult, vehicleResult, userResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, bio, avatar_url, social_links, id_verified, rating_avg, rating_count, account_status, suspended_until, completed_rides_count, created_at")
        .eq("id", profileId)
        .single(),
      supabase.rpc("is_phone_verified", { user_id: profileId }),
      supabase
        .from("vehicles")
        .select("id, make, model, photo_url")
        .eq("owner_id", profileId)
        .eq("is_primary", true)
        .maybeSingle(),
      supabase.auth.getUser(),
    ]);

    if (profileResult.error || !profileResult.data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProfile(profileResult.data);
    setPhoneVerified(phoneResult.data === true);
    setPrimaryVehicle(vehicleResult.data || null);

    const userId = userResult.data.user?.id ?? null;
    setCurrentUserId(userId);

    // If viewing own profile, check for pending reviews
    if (userId && userId === profileId) {
      const { data: pending } = await supabase.rpc("get_pending_reviews");
      if (pending) {
        setPendingReviews(pending as PendingReview[]);
      }
    }

    // If viewing another user's profile, check block status
    if (userId && userId !== profileId) {
      const { data: blockData } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("blocker_id", userId)
        .eq("blocked_id", profileId)
        .maybeSingle();
      setIsBlocked(!!blockData);
    }

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

  const isOwnProfile = currentUserId === profileId;

  // Banned user: show minimal info to visitors
  if (!isOwnProfile && profile?.account_status === "banned") {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-text-main">Profile</h1>
        <div className="rounded-2xl border border-border-pastel bg-surface p-8 text-center">
          <svg
            className="mx-auto mb-3 h-12 w-12 text-text-secondary/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
          <h2 className="mb-2 text-lg font-bold text-text-main">
            This account has been suspended
          </h2>
          <p className="text-sm text-text-secondary">
            This user&apos;s profile is not available.
          </p>
        </div>
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-main">Profile</h1>

        {/* Actions menu (three dots) - only on other users' profiles */}
        {!isOwnProfile && currentUserId && (
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-background"
              aria-label="Profile actions"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showActionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowActionsMenu(false)}
                />
                <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-border-pastel bg-surface py-1 shadow-lg">
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowReportDialog(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text-main transition-colors hover:bg-primary/5"
                  >
                    <svg
                      className="h-4 w-4 text-text-secondary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                      />
                    </svg>
                    Report
                  </button>
                  <div className="px-4 py-1">
                    <BlockButton
                      userId={profileId}
                      userName={profile?.display_name || undefined}
                      initialBlocked={isBlocked}
                      onBlockChange={(blocked) => setIsBlocked(blocked)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Suspension banner for own profile */}
      {isOwnProfile && profile?.account_status === "suspended" && profile?.suspended_until && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Your account is suspended</p>
              <p className="mt-1 text-sm text-amber-700">
                You cannot post rides or make bookings until{" "}
                {new Date(profile.suspended_until).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Block banner when viewing a blocked user */}
      {!isOwnProfile && isBlocked && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">You have blocked this user</span>
            </div>
            <BlockButton
              userId={profileId}
              userName={profile?.display_name || undefined}
              initialBlocked={true}
              onBlockChange={(blocked) => setIsBlocked(blocked)}
            />
          </div>
        </div>
      )}

      {/* Pending ratings banner (own profile only) */}
      {currentUserId === profileId && pendingReviews.length > 0 && (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm font-medium text-warning">
            You have {pendingReviews.length} ride{pendingReviews.length !== 1 ? "s" : ""} to rate
          </p>
          <div className="mt-2 space-y-2">
            {pendingReviews.map((pr) => (
              <button
                key={pr.booking_id}
                onClick={() => setRatingModalReview(pr)}
                className="flex w-full items-center gap-2 rounded-lg bg-surface px-3 py-2 text-left text-sm text-text-main transition-colors hover:bg-primary/5"
              >
                <span className="truncate">
                  {pr.origin_address} &rarr; {pr.destination_address}
                </span>
                <span className="ml-auto flex-shrink-0 text-xs font-medium text-primary">
                  Rate {pr.other_user_name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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

          {/* User level badge (large variant) */}
          <div className="mt-2 w-full max-w-xs">
            <LevelBadge
              completedRides={profile?.completed_rides_count ?? 0}
              ratingAvg={profile?.rating_avg ?? 0}
              variant="large"
            />
          </div>

          {/* Rating display */}
          <div className="mt-2">
            <StarRating
              rating={profile?.rating_avg ?? null}
              count={profile?.rating_count ?? 0}
              size="md"
            />
          </div>

          {/* Verification and experience badges */}
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
            <ExperiencedBadge
              completedRidesCount={profile?.completed_rides_count ?? 0}
            />
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

      {/* Achievement badges */}
      <div className="mb-4 rounded-2xl border border-border-pastel bg-surface p-6">
        <BadgesSection userId={profileId} />
      </div>

      {/* Reviews section */}
      <div className="mb-4">
        <h3 className="mb-3 text-sm font-semibold text-text-main">Reviews</h3>
        <ReviewList key={reviewListKey} userId={profileId} />
      </div>

      {/* Report dialog */}
      {!isOwnProfile && profile && (
        <ReportDialog
          reportedUserId={profileId}
          reportedUserName={profile.display_name || "User"}
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
        />
      )}

      {/* Rating modal for pending reviews */}
      {ratingModalReview && (
        <RatingModal
          bookingId={ratingModalReview.booking_id}
          otherUserName={ratingModalReview.other_user_name}
          otherUserAvatar={ratingModalReview.other_user_avatar}
          isOpen={true}
          onClose={() => setRatingModalReview(null)}
          onSubmitted={() => {
            setRatingModalReview(null);
            setPendingReviews((prev) =>
              prev.filter(
                (pr) => pr.booking_id !== ratingModalReview.booking_id,
              ),
            );
            setReviewListKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
