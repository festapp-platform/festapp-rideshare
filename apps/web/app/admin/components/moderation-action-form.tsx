"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SUSPENSION_DURATIONS } from "@festapp/shared";
import { toast } from "sonner";

interface ModerationActionFormProps {
  userId: string;
  userName: string;
  currentStatus: string;
}

type ActionType = "warning" | "suspension" | "ban" | "unban" | "unsuspend";

/**
 * Moderation action form (ADMN-03).
 * Allows admin to warn, suspend, ban, unsuspend, or unban a user.
 */
export function ModerationActionForm({
  userId,
  userName,
  currentStatus,
}: ModerationActionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAction = searchParams.get("action");
  const reportId = searchParams.get("report");

  const [actionType, setActionType] = useState<ActionType | "">(
    preselectedAction === "warn"
      ? "warning"
      : preselectedAction === "suspend"
        ? "suspension"
        : preselectedAction === "ban"
          ? "ban"
          : "",
  );
  const [reason, setReason] = useState("");
  const [durationDays, setDurationDays] = useState(3);
  const [cancelRides, setCancelRides] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Available actions depend on current account status
  const availableActions: { value: ActionType; label: string }[] = (() => {
    switch (currentStatus) {
      case "suspended":
        return [
          { value: "unsuspend", label: "Unsuspend (Lift Early)" },
          { value: "ban", label: "Ban (Escalate)" },
        ];
      case "banned":
        return [{ value: "unban", label: "Unban" }];
      default:
        return [
          { value: "warning", label: "Warning" },
          { value: "suspension", label: "Suspension" },
          { value: "ban", label: "Ban" },
        ];
    }
  })();

  async function handleSubmit() {
    if (!actionType || !reason.trim()) {
      toast.error("Please select an action and provide a reason");
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      let error;

      switch (actionType) {
        case "warning": {
          const result = await supabase.rpc("admin_warn_user", {
            p_user_id: userId,
            p_reason: reason,
          });
          error = result.error;
          break;
        }
        case "suspension": {
          const result = await supabase.rpc("admin_suspend_user", {
            p_user_id: userId,
            p_reason: reason,
            p_duration_days: durationDays,
          });
          error = result.error;
          break;
        }
        case "ban": {
          const result = await supabase.rpc("admin_ban_user", {
            p_user_id: userId,
            p_reason: reason,
            p_cancel_rides: cancelRides,
          });
          error = result.error;
          break;
        }
        case "unban": {
          const result = await supabase.rpc("admin_unban_user", {
            p_user_id: userId,
            p_reason: reason,
          });
          error = result.error;
          break;
        }
        case "unsuspend": {
          // Unsuspend by updating the profile directly (no dedicated RPC)
          const result = await supabase
            .from("profiles")
            .update({
              account_status: "active",
              suspended_until: null,
            })
            .eq("id", userId);
          error = result.error;
          break;
        }
      }

      if (error) {
        toast.error(error.message || "Action failed");
        setLoading(false);
        setShowConfirm(false);
        return;
      }

      toast.success(`${actionType} applied to ${userName}`);
      setReason("");
      setActionType("");
      setShowConfirm(false);
      router.refresh();
    } catch {
      toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">
        Take Moderation Action
      </h2>

      {reportId && (
        <p className="mb-3 text-xs text-indigo-600">
          Linked to report {reportId.slice(0, 8)}...
        </p>
      )}

      <div className="space-y-4">
        {/* Action type selector */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-700">
            Action Type
          </label>
          <div className="flex flex-wrap gap-2">
            {availableActions.map((action) => (
              <button
                key={action.value}
                onClick={() => {
                  setActionType(action.value);
                  setShowConfirm(false);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  actionType === action.value
                    ? action.value === "ban"
                      ? "bg-red-600 text-white"
                      : action.value === "suspension"
                        ? "bg-orange-600 text-white"
                        : action.value === "warning"
                          ? "bg-yellow-500 text-white"
                          : "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        {actionType && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              Reason (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setShowConfirm(false);
              }}
              placeholder="Explain the reason for this action..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
        )}

        {/* Suspension duration */}
        {actionType === "suspension" && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              Duration
            </label>
            <div className="flex gap-2">
              {SUSPENSION_DURATIONS.map((d) => (
                <button
                  key={d.days}
                  onClick={() => setDurationDays(d.days)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    durationDays === d.days
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ban: cancel rides checkbox */}
        {actionType === "ban" && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={cancelRides}
              onChange={(e) => setCancelRides(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Auto-cancel active rides
            </span>
          </label>
        )}

        {/* Submit */}
        {actionType && (
          <div>
            {showConfirm && (
              <p className="mb-2 text-sm font-medium text-red-600">
                Are you sure? Click again to confirm {actionType} for {userName}.
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading || !reason.trim()}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                showConfirm
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {loading
                ? "Processing..."
                : showConfirm
                  ? "Confirm Action"
                  : "Apply Action"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
