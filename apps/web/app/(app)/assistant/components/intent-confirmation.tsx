"use client";

interface IntentConfirmationProps {
  intent: {
    action: string;
    params: Record<string, unknown>;
    display_text: string;
  };
  onConfirm: () => void;
  onReject: () => void;
  isExecuting: boolean;
}

/** Human-readable labels for AI actions. */
const ACTION_LABELS: Record<string, string> = {
  create_ride: "Create Ride",
  search_rides: "Search Rides",
  book_seat: "Book Seat",
  cancel_booking: "Cancel Booking",
  edit_ride: "Edit Ride",
  complete_ride: "Complete Ride",
};

/** Badge color per action type. */
const ACTION_COLORS: Record<string, string> = {
  create_ride: "bg-green-100 text-green-800",
  search_rides: "bg-blue-100 text-blue-800",
  book_seat: "bg-indigo-100 text-indigo-800",
  cancel_booking: "bg-red-100 text-red-800",
  edit_ride: "bg-amber-100 text-amber-800",
  complete_ride: "bg-emerald-100 text-emerald-800",
};

/**
 * Format a parameter value for human-readable display.
 */
function formatParamValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "-";

  // Date formatting
  if (
    typeof value === "string" &&
    (key.includes("date") || key.includes("time"))
  ) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("cs-CZ", {
          day: "numeric",
          month: "long",
          year: "numeric",
          ...(key.includes("time")
            ? { hour: "2-digit", minute: "2-digit" }
            : {}),
        });
      }
    } catch {
      // Fall through to string display
    }
  }

  // Seats formatting
  if (key === "seats" || key === "available_seats") {
    return `${value} seat(s)`;
  }

  // Price formatting
  if (key.includes("price")) {
    return `${value} CZK`;
  }

  return String(value);
}

/** Readable label for param keys. */
function formatParamKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Confirmation card showing parsed intent parameters before execution.
 *
 * Displays action type as a badge, key parameters in a readable list,
 * and confirm/cancel buttons. Shows spinner while executing.
 */
export function IntentConfirmation({
  intent,
  onConfirm,
  onReject,
  isExecuting,
}: IntentConfirmationProps) {
  const actionLabel = ACTION_LABELS[intent.action] ?? intent.action;
  const badgeColor =
    ACTION_COLORS[intent.action] ?? "bg-gray-100 text-gray-800";

  // Filter out internal params and display meaningful ones
  const displayParams = Object.entries(intent.params).filter(
    ([key]) => !key.startsWith("_") && key !== "action",
  );

  return (
    <div className="rounded-xl border border-border-pastel bg-white p-4 shadow-sm">
      {/* Action badge */}
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}
        >
          {actionLabel}
        </span>
      </div>

      {/* Display text from AI */}
      {intent.display_text && (
        <p className="mb-3 text-sm text-text-main">{intent.display_text}</p>
      )}

      {/* Parameters list */}
      {displayParams.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {displayParams.map(([key, value]) => (
            <div key={key} className="flex items-baseline gap-2 text-sm">
              <span className="font-medium text-text-secondary min-w-[120px]">
                {formatParamKey(key)}:
              </span>
              <span className="text-text-main">
                {formatParamValue(key, value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onConfirm}
          disabled={isExecuting}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExecuting ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Executing...
            </>
          ) : (
            "Confirm"
          )}
        </button>
        <button
          onClick={onReject}
          disabled={isExecuting}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
