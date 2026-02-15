"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EVENT_STATUS } from "@festapp/shared";

interface EventData {
  id: string;
  name: string;
  description: string | null;
  location_address: string;
  event_date: string;
  event_end_date: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  creator_id: string;
  creator: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Admin event detail page at /admin/events/[id].
 * Shows full event details with approve/reject actions using two-click confirm.
 */
export default function AdminEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      const { data } = await supabase
        .from("events")
        .select(
          "*, creator:profiles!events_creator_id_fkey(id, display_name, avatar_url)",
        )
        .eq("id", eventId)
        .single();

      if (data) {
        // Normalize creator from PostgREST FK join
        const normalized = {
          ...data,
          creator: Array.isArray(data.creator)
            ? data.creator[0] ?? null
            : data.creator ?? null,
        };
        setEvent(normalized as EventData);
      }

      setLoading(false);
    }
    fetchEvent();
  }, [eventId, supabase]);

  async function handleApprove() {
    if (confirmAction !== "approve") {
      setConfirmAction("approve");
      return;
    }

    setProcessing(true);
    setActionError(null);

    const { error } = await supabase.rpc("admin_approve_event", {
      p_event_id: eventId,
    });

    if (error) {
      setActionError(error.message);
      setProcessing(false);
      return;
    }

    router.push("/admin/events");
  }

  async function handleReject() {
    if (confirmAction !== "reject") {
      setConfirmAction("reject");
      return;
    }

    setProcessing(true);
    setActionError(null);

    const { error } = await supabase.rpc("admin_reject_event", {
      p_event_id: eventId,
      p_reason: rejectReason || null,
    });

    if (error) {
      setActionError(error.message);
      setProcessing(false);
      return;
    }

    router.push("/admin/events");
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        Loading event...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        Event not found.
      </div>
    );
  }

  const isPending = event.status === EVENT_STATUS.PENDING;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back link */}
      <button
        onClick={() => router.push("/admin/events")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </button>

      {/* Event details card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {/* Status badge */}
        <div className="mb-4">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              event.status === EVENT_STATUS.PENDING
                ? "bg-amber-100 text-amber-700"
                : event.status === EVENT_STATUS.APPROVED
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </span>
        </div>

        <h1 className="mb-4 text-xl font-bold text-gray-900">{event.name}</h1>

        {event.description && (
          <p className="mb-4 text-sm text-gray-600 whitespace-pre-line">
            {event.description}
          </p>
        )}

        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Calendar className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span>
              {format(
                parseISO(event.event_date),
                "EEEE, MMMM d, yyyy 'at' h:mm a",
              )}
            </span>
          </div>
          {event.event_end_date && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Calendar className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span>
                Ends{" "}
                {format(
                  parseISO(event.event_end_date),
                  "EEEE, MMMM d, yyyy 'at' h:mm a",
                )}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span>{event.location_address}</span>
          </div>
        </div>

        {/* Creator */}
        {event.creator && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <User className="h-4 w-4 text-gray-400" />
            <div className="flex items-center gap-2">
              {event.creator.avatar_url ? (
                <img
                  src={event.creator.avatar_url}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                  {event.creator.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-gray-900">
                {event.creator.display_name}
              </span>
            </div>
          </div>
        )}

        {/* Admin notes (if rejected) */}
        {event.admin_notes && (
          <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <strong>Rejection reason:</strong> {event.admin_notes}
          </div>
        )}

        {/* Submitted date */}
        <p className="mb-6 text-xs text-gray-400">
          Submitted {format(parseISO(event.created_at), "MMM d, yyyy 'at' h:mm a")}
        </p>

        {/* Action buttons (only for pending events) */}
        {isPending && (
          <div className="border-t border-gray-200 pt-4">
            {actionError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            {/* Reject reason textarea */}
            {confirmAction === "reject" && (
              <div className="mb-4">
                <label
                  htmlFor="rejectReason"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Rejection reason (optional)
                </label>
                <textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this event is being rejected..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={processing}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  confirmAction === "approve"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-green-50 text-green-700 hover:bg-green-100"
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                {confirmAction === "approve"
                  ? "Confirm Approve"
                  : "Approve"}
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  confirmAction === "reject"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-red-50 text-red-700 hover:bg-red-100"
                }`}
              >
                <XCircle className="h-4 w-4" />
                {confirmAction === "reject" ? "Confirm Reject" : "Reject"}
              </button>
            </div>

            {confirmAction && (
              <button
                onClick={() => setConfirmAction(null)}
                className="mt-2 w-full text-center text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
