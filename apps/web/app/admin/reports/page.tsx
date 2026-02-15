"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getReportsForAdmin, REPORT_STATUS } from "@festapp/shared";
import type { ReportStatus } from "@festapp/shared";
import { Flag } from "lucide-react";

type Report = {
  id: string;
  description: string;
  status: string;
  created_at: string;
  reporter: { id: string; display_name: string; avatar_url: string | null } | null;
  reported_user: { id: string; display_name: string; avatar_url: string | null } | null;
};

const STATUS_TABS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Open", value: REPORT_STATUS.OPEN },
  { label: "Reviewing", value: REPORT_STATUS.REVIEWING },
  { label: "Resolved", value: REPORT_STATUS.RESOLVED },
  { label: "Dismissed", value: REPORT_STATUS.DISMISSED },
];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  reviewing: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-600",
};

/**
 * Reports list page (ADMN-02).
 * Filterable list of user reports with status tabs.
 */
export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");
  const [activeStatus, setActiveStatus] = useState<string | null>(initialStatus);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      const supabase = createClient();
      const query = getReportsForAdmin(supabase, activeStatus ?? undefined);
      const { data } = await query;
      // Normalize the joined relations to handle single-object shape
      setReports(
        (data ?? []).map((r: any) => ({
          ...r,
          reporter: Array.isArray(r.reporter) ? r.reporter[0] : r.reporter,
          reported_user: Array.isArray(r.reported_user) ? r.reported_user[0] : r.reported_user,
        })),
      );
      setLoading(false);
    }
    fetchReports();
  }, [activeStatus]);

  function handleTabChange(value: string | null) {
    setActiveStatus(value);
    const params = new URLSearchParams();
    if (value) params.set("status", value);
    router.replace(`/admin/reports${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage user reports
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabChange(tab.value)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeStatus === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-16">
          <Flag className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No reports found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/admin/reports/${report.id}`}
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
            >
              {/* Reported user avatar */}
              <div className="flex-shrink-0">
                {report.reported_user?.avatar_url ? (
                  <img
                    src={report.reported_user.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
                    {report.reported_user?.display_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
              </div>

              {/* Report info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {report.reported_user?.display_name || "Unknown"}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[report.status] || STATUS_COLORS.open
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  Reported by {report.reporter?.display_name || "Unknown"} -{" "}
                  {report.description.length > 100
                    ? report.description.slice(0, 100) + "..."
                    : report.description}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(report.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
