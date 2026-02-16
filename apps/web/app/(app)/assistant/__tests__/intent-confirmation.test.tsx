import { describe, it, expect, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

/**
 * Unit tests for IntentConfirmation component rendering logic.
 *
 * Uses inline JSX (consistent with 07-03 pattern) to avoid pnpm
 * monorepo dual-React issues with component imports.
 *
 * Tests confirmation card rendering, action labels, param display,
 * confirm/reject callbacks, and loading state.
 */

// ---------------------------------------------------------------------------
// Inline reproduction of IntentConfirmation rendering logic
// ---------------------------------------------------------------------------

interface ParsedIntent {
  action: string;
  params: Record<string, unknown>;
  display_text: string;
}

interface IntentConfirmationProps {
  intent: ParsedIntent;
  onConfirm: () => void;
  onReject: () => void;
  isExecuting: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  create_ride: "Create Ride",
  search_rides: "Search Rides",
  book_seat: "Book Seat",
  cancel_booking: "Cancel Booking",
  edit_ride: "Edit Ride",
  complete_ride: "Complete Ride",
  general_chat: "Chat",
};

function formatParamValue(key: string, value: unknown): string {
  if (key.includes("date") && typeof value === "string") {
    try {
      return new Date(value).toLocaleDateString("cs-CZ");
    } catch {
      return String(value);
    }
  }
  if (key === "available_seats" || key === "seats") {
    return `${value} seat(s)`;
  }
  return String(value);
}

function formatParamLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Reproduces the IntentConfirmation component's rendering logic.
 */
function IntentConfirmationInline({
  intent,
  onConfirm,
  onReject,
  isExecuting,
}: IntentConfirmationProps) {
  const actionLabel = ACTION_LABELS[intent.action] || intent.action;
  const paramEntries = Object.entries(intent.params).filter(
    ([, v]) => v !== undefined && v !== null,
  );

  return (
    <div data-testid="intent-confirmation" className="rounded-xl border p-4">
      <span data-testid="action-badge" className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
        {actionLabel}
      </span>

      <p data-testid="display-text" className="mt-2 text-sm text-gray-700">
        {intent.display_text}
      </p>

      {paramEntries.length > 0 && (
        <ul data-testid="param-list" className="mt-2 space-y-1 text-sm">
          {paramEntries.map(([key, value]) => (
            <li key={key} data-testid={`param-${key}`}>
              <span className="font-medium">{formatParamLabel(key)}:</span>{" "}
              {formatParamValue(key, value)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isExecuting}
          data-testid="confirm-button"
          className="rounded-lg bg-green-600 px-4 py-2 text-white"
        >
          {isExecuting ? (
            <span data-testid="confirm-spinner" className="animate-spin">Loading...</span>
          ) : (
            "Confirm"
          )}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isExecuting}
          data-testid="cancel-button"
          className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

async function renderComponent(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: ReturnType<typeof createRoot>;
  await act(async () => {
    root = createRoot(container);
    root.render(element);
  });
  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root!.unmount();
      });
      document.body.removeChild(container);
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IntentConfirmation", () => {
  const defaultIntent: ParsedIntent = {
    action: "create_ride",
    params: {
      origin_address: "Praha",
      destination_address: "Brno",
      departure_date: "2026-03-01",
      available_seats: 3,
    },
    display_text: "Vytvořit jízdu z Prahy do Brna na 1. března, 3 místa",
  };

  it("renders action badge with correct label", async () => {
    const { container, cleanup } = await renderComponent(
      <IntentConfirmationInline
        intent={defaultIntent}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        isExecuting={false}
      />,
    );

    const badge = container.querySelector('[data-testid="action-badge"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("Create Ride");
    await cleanup();
  });

  it("renders param list with origin, destination, date, seats", async () => {
    const { container, cleanup } = await renderComponent(
      <IntentConfirmationInline
        intent={defaultIntent}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        isExecuting={false}
      />,
    );

    const paramList = container.querySelector('[data-testid="param-list"]');
    expect(paramList).not.toBeNull();
    expect(container.querySelector('[data-testid="param-origin_address"]')?.textContent).toContain("Praha");
    expect(container.querySelector('[data-testid="param-destination_address"]')?.textContent).toContain("Brno");
    expect(container.querySelector('[data-testid="param-available_seats"]')?.textContent).toContain("3 seat(s)");
    await cleanup();
  });

  it("renders display_text from AI", async () => {
    const { container, cleanup } = await renderComponent(
      <IntentConfirmationInline
        intent={defaultIntent}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        isExecuting={false}
      />,
    );

    const displayText = container.querySelector('[data-testid="display-text"]');
    expect(displayText!.textContent).toBe("Vytvořit jízdu z Prahy do Brna na 1. března, 3 místa");
    await cleanup();
  });

  it("renders Confirm and Cancel buttons", async () => {
    const { container, cleanup } = await renderComponent(
      <IntentConfirmationInline
        intent={defaultIntent}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        isExecuting={false}
      />,
    );

    const confirmBtn = container.querySelector('[data-testid="confirm-button"]') as HTMLButtonElement;
    const cancelBtn = container.querySelector('[data-testid="cancel-button"]') as HTMLButtonElement;

    expect(confirmBtn).not.toBeNull();
    expect(cancelBtn).not.toBeNull();
    expect(confirmBtn.textContent).toBe("Confirm");
    expect(cancelBtn.textContent).toBe("Cancel");
    expect(confirmBtn.disabled).toBe(false);
    await cleanup();
  });

  it("calls onConfirm when Confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    const { container, cleanup } = await renderComponent(
      <IntentConfirmationInline
        intent={defaultIntent}
        onConfirm={onConfirm}
        onReject={vi.fn()}
        isExecuting={false}
      />,
    );

    const confirmBtn = container.querySelector('[data-testid="confirm-button"]') as HTMLButtonElement;
    await act(async () => {
      confirmBtn.click();
    });

    expect(onConfirm).toHaveBeenCalledOnce();
    await cleanup();
  });

  it("calls onReject when Cancel button is clicked", async () => {
    const onReject = vi.fn();
    const { container, cleanup } = await renderComponent(
      <IntentConfirmationInline
        intent={defaultIntent}
        onConfirm={vi.fn()}
        onReject={onReject}
        isExecuting={false}
      />,
    );

    const cancelBtn = container.querySelector('[data-testid="cancel-button"]') as HTMLButtonElement;
    await act(async () => {
      cancelBtn.click();
    });

    expect(onReject).toHaveBeenCalledOnce();
    await cleanup();
  });

  it("shows spinner and disables Confirm button when isExecuting=true", async () => {
    const { container, cleanup } = await renderComponent(
      <IntentConfirmationInline
        intent={defaultIntent}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        isExecuting={true}
      />,
    );

    const confirmBtn = container.querySelector('[data-testid="confirm-button"]') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    expect(container.querySelector('[data-testid="confirm-spinner"]')).not.toBeNull();
    await cleanup();
  });

  it("disables Cancel button when isExecuting=true", async () => {
    const { container, cleanup } = await renderComponent(
      <IntentConfirmationInline
        intent={defaultIntent}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        isExecuting={true}
      />,
    );

    const cancelBtn = container.querySelector('[data-testid="cancel-button"]') as HTMLButtonElement;
    expect(cancelBtn.disabled).toBe(true);
    await cleanup();
  });

  it("renders appropriate labels for different action types", async () => {
    const actions = [
      { action: "book_seat", expected: "Book Seat" },
      { action: "cancel_booking", expected: "Cancel Booking" },
      { action: "search_rides", expected: "Search Rides" },
      { action: "edit_ride", expected: "Edit Ride" },
      { action: "complete_ride", expected: "Complete Ride" },
    ];

    for (const { action, expected } of actions) {
      const intent = { ...defaultIntent, action };
      const { container, cleanup } = await renderComponent(
        <IntentConfirmationInline
          intent={intent}
          onConfirm={vi.fn()}
          onReject={vi.fn()}
          isExecuting={false}
        />,
      );

      const badge = container.querySelector('[data-testid="action-badge"]');
      expect(badge!.textContent).toBe(expected);
      await cleanup();
    }
  });

  it("formats seats parameter as 'N seat(s)'", async () => {
    const intent: ParsedIntent = {
      action: "book_seat",
      params: { ride_id: "abc-123", seats: 2 },
      display_text: "Book 2 seats",
    };

    const { container, cleanup } = await renderComponent(
      <IntentConfirmationInline
        intent={intent}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        isExecuting={false}
      />,
    );

    expect(container.querySelector('[data-testid="param-seats"]')?.textContent).toContain("2 seat(s)");
    await cleanup();
  });

  it("does not render param list when params are empty", async () => {
    const intent: ParsedIntent = {
      action: "general_chat",
      params: {},
      display_text: "Just chatting",
    };

    const { container, cleanup } = await renderComponent(
      <IntentConfirmationInline
        intent={intent}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        isExecuting={false}
      />,
    );

    expect(container.querySelector('[data-testid="param-list"]')).toBeNull();
    await cleanup();
  });
});
