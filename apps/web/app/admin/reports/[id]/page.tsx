import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getReportById } from "@festapp/shared";
import { ReportActions } from "./report-actions";

/**
 * Report detail page (ADMN-02).
 * Shows full report context, reported user info, and resolution actions.
 */
export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: report, error } = await getReportById(supabase, id);

  if (error || !report) {
    notFound();
  }

  const reporter: any = Array.isArray(report.reporter)
    ? report.reporter[0]
    : report.reporter;
  const reportedUser: any = Array.isArray(report.reported_user)
    ? report.reported_user[0]
    : report.reported_user;

  const isResolved = report.status === "resolved" || report.status === "dismissed";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/reports"
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          &larr; Back to Reports
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Report Detail</h1>
      </div>

      {/* Status badge */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Status:</span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              report.status === "open"
                ? "bg-red-100 text-red-700"
                : report.status === "reviewing"
                  ? "bg-yellow-100 text-yellow-700"
                  : report.status === "resolved"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
            }`}
          >
            {report.status}
          </span>
          <span className="text-xs text-gray-400">
            Filed {new Date(report.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-gray-700">
          {report.description}
        </p>
      </div>

      {/* Reporter and reported user */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Reporter */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Reporter</h2>
          <div className="flex items-center gap-3">
            {reporter?.avatar_url ? (
              <img
                src={reporter.avatar_url}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
                {reporter?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {reporter?.display_name || "Unknown"}
              </p>
              <Link
                href={`/admin/users/${reporter?.id}`}
                className="text-xs text-indigo-600 hover:text-indigo-700"
              >
                View profile
              </Link>
            </div>
          </div>
        </div>

        {/* Reported user */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Reported User
          </h2>
          <div className="flex items-center gap-3">
            {reportedUser?.avatar_url ? (
              <img
                src={reportedUser.avatar_url}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
                {reportedUser?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {reportedUser?.display_name || "Unknown"}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>
                  {reportedUser?.rating_avg
                    ? `${Number(reportedUser.rating_avg).toFixed(1)} rating`
                    : "No rating"}
                </span>
                <span>|</span>
                <span>
                  {reportedUser?.completed_rides_count ?? 0} rides
                </span>
                <span>|</span>
                <span
                  className={
                    reportedUser?.account_status === "banned"
                      ? "text-red-600"
                      : reportedUser?.account_status === "suspended"
                        ? "text-yellow-600"
                        : "text-green-600"
                  }
                >
                  {reportedUser?.account_status || "active"}
                </span>
              </div>
              <Link
                href={`/admin/users/${reportedUser?.id}`}
                className="text-xs text-indigo-600 hover:text-indigo-700"
              >
                View profile & moderate
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Context links */}
      {(report.ride_id || report.booking_id || report.review_id) && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Context</h2>
          <div className="flex flex-wrap gap-2">
            {report.ride_id && (
              <Link
                href={`/rides/${report.ride_id}`}
                className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                View Ride
              </Link>
            )}
            {report.booking_id && (
              <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
                Booking: {report.booking_id.slice(0, 8)}...
              </span>
            )}
            {report.review_id && (
              <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
                Review: {report.review_id.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Resolution info or actions */}
      {isResolved ? (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Resolution</h2>
          <p className="text-sm text-gray-500">
            {report.status === "resolved" ? "Resolved" : "Dismissed"} on{" "}
            {report.resolved_at
              ? new Date(report.resolved_at).toLocaleDateString()
              : "N/A"}
          </p>
          {report.admin_notes && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
              {report.admin_notes}
            </p>
          )}
        </div>
      ) : (
        <ReportActions reportId={report.id} currentStatus={report.status} />
      )}

      {/* Quick moderation links */}
      {!isResolved && reportedUser && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/users/${reportedUser.id}?action=warn&report=${report.id}`}
              className="rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-100"
            >
              Warn User
            </Link>
            <Link
              href={`/admin/users/${reportedUser.id}?action=suspend&report=${report.id}`}
              className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
            >
              Suspend User
            </Link>
            <Link
              href={`/admin/users/${reportedUser.id}?action=ban&report=${report.id}`}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Ban User
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
