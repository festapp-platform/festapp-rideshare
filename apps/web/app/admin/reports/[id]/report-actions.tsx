"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ReportActionsProps {
  reportId: string;
  currentStatus: string;
}

/**
 * Report resolution actions (ADMN-02).
 * Mark as reviewing, resolve, or dismiss a report.
 */
export function ReportActions({ reportId, currentStatus }: ReportActionsProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setLoading(true);
    const supabase = createClient();

    if (newStatus === "reviewing") {
      const { error } = await supabase
        .from("reports")
        .update({ status: "reviewing" })
        .eq("id", reportId);

      if (error) {
        toast.error("Failed to update report status");
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.rpc("admin_resolve_report", {
        p_report_id: reportId,
        p_status: newStatus,
        p_admin_notes: notes || null,
      });

      if (error) {
        toast.error(error.message || "Failed to resolve report");
        setLoading(false);
        return;
      }
    }

    toast.success(
      newStatus === "reviewing"
        ? "Report marked as reviewing"
        : newStatus === "resolved"
          ? "Report resolved"
          : "Report dismissed",
    );
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Actions</h2>

      {currentStatus === "open" && (
        <button
          onClick={() => handleStatusChange("reviewing")}
          disabled={loading}
          className="mb-4 rounded-lg bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
        >
          Mark as Reviewing
        </button>
      )}

      <div className="space-y-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Admin notes (optional for dismiss, recommended for resolve)"
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />

        <div className="flex gap-2">
          <button
            onClick={() => handleStatusChange("resolved")}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Resolve
          </button>
          <button
            onClick={() => handleStatusChange("dismissed")}
            disabled={loading}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
