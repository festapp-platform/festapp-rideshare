import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getModerationHistory, getReviewsForUser } from "@festapp/shared";
import { ModerationActionForm } from "../../components/moderation-action-form";

/**
 * Admin user detail page (ADMN-03).
 * Shows profile, moderation history, reports, reviews, and moderation actions.
 */
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch user data in parallel
  const [profileResult, historyResult, reportsResult, reviewsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, display_name, avatar_url, account_status, suspended_until, rating_avg, rating_count, completed_rides_count, id_verified, created_at",
        )
        .eq("id", id)
        .single(),
      getModerationHistory(supabase, id),
      supabase
        .from("reports")
        .select("id, description, status, created_at, reporter:reporter_id(display_name)")
        .eq("reported_user_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      getReviewsForUser(supabase, id),
    ]);

  if (profileResult.error || !profileResult.data) {
    notFound();
  }

  const profile = profileResult.data;
  const history = historyResult.data ?? [];
  const reports = (reportsResult.data ?? []) as any[];
  const reviews = (reviewsResult.data ?? []) as any[];

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    suspended: "bg-yellow-100 text-yellow-700",
    banned: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          &larr; Back to Users
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">User Detail</h1>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xl font-semibold text-gray-500">
              {profile.display_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {profile.display_name}
              </h2>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  STATUS_COLORS[profile.account_status] || STATUS_COLORS.active
                }`}
              >
                {profile.account_status}
              </span>
            </div>
            {profile.account_status === "suspended" && profile.suspended_until && (
              <p className="mt-0.5 text-xs text-yellow-600">
                Suspended until{" "}
                {new Date(profile.suspended_until).toLocaleDateString()}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
              <span>
                Rating:{" "}
                {profile.rating_count > 0
                  ? `${Number(profile.rating_avg).toFixed(1)} (${profile.rating_count} reviews)`
                  : "No rating"}
              </span>
              <span>Rides: {profile.completed_rides_count}</span>
              <span>
                ID Verified: {profile.id_verified ? "Yes" : "No"}
              </span>
              <span>
                Joined: {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Moderation action form */}
      <ModerationActionForm
        userId={profile.id}
        userName={profile.display_name}
        currentStatus={profile.account_status}
      />

      {/* Moderation history */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Moderation History
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No moderation actions taken</p>
        ) : (
          <div className="space-y-3">
            {history.map((action: any) => (
              <div
                key={action.id}
                className="border-l-2 border-gray-200 pl-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      action.action_type === "ban"
                        ? "bg-red-100 text-red-700"
                        : action.action_type === "suspension"
                          ? "bg-orange-100 text-orange-700"
                          : action.action_type === "warning"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                    }`}
                  >
                    {action.action_type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(action.created_at).toLocaleDateString()} by{" "}
                    {action.admin?.display_name || "System"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{action.reason}</p>
                {action.duration_days && (
                  <p className="text-xs text-gray-400">
                    Duration: {action.duration_days} days
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reports against this user */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Reports ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-400">No reports filed against this user</p>
        ) : (
          <div className="space-y-2">
            {reports.map((report: any) => {
              const reporter = Array.isArray(report.reporter)
                ? report.reporter[0]
                : report.reporter;
              return (
                <Link
                  key={report.id}
                  href={`/admin/reports/${report.id}`}
                  className="block rounded-lg bg-gray-50 p-3 text-sm hover:bg-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      By {reporter?.display_name || "Unknown"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        report.status === "open"
                          ? "bg-red-100 text-red-700"
                          : report.status === "reviewing"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-gray-500">
                    {report.description}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">No reviews for this user</p>
        ) : (
          <div className="space-y-2">
            {reviews.map((review: any) => {
              const reviewer = Array.isArray(review.reviewer)
                ? review.reviewer[0]
                : review.reviewer;
              return (
                <div
                  key={review.id}
                  className="rounded-lg bg-gray-50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      By {reviewer?.display_name || "Unknown"}
                    </span>
                    <span className="text-yellow-600">
                      {"*".repeat(review.rating)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-1 text-gray-500">{review.comment}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
