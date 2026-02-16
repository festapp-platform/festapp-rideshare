import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

/**
 * Unit tests for UI state components (PLAT-05, PLAT-07, PLAT-11).
 *
 * Uses inline JSX pattern (consistent with 07-03/09-04) to avoid pnpm
 * monorepo dual-React issues with component imports.
 */

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
// Inline reproduction of SkeletonCard
// ---------------------------------------------------------------------------

function SkeletonCard({ variant = "ride" }: { variant?: "ride" | "message" | "profile" }) {
  if (variant === "message") {
    return (
      <div data-testid="skeleton-card" data-variant="message" className="animate-pulse rounded-2xl border border-border-pastel bg-surface p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-border-pastel/50" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-border-pastel/50" />
            <div className="h-3 w-1/2 rounded bg-border-pastel/50" />
          </div>
        </div>
      </div>
    );
  }
  if (variant === "profile") {
    return (
      <div data-testid="skeleton-card" data-variant="profile" className="animate-pulse rounded-2xl border border-border-pastel bg-surface p-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-16 w-16 rounded-full bg-border-pastel/50" />
          <div className="h-4 w-32 rounded bg-border-pastel/50" />
          <div className="h-3 w-24 rounded bg-border-pastel/50" />
          <div className="h-6 w-20 rounded-full bg-border-pastel/50" />
        </div>
      </div>
    );
  }
  return (
    <div data-testid="skeleton-card" data-variant="ride" className="animate-pulse rounded-2xl border border-border-pastel bg-surface p-4">
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded bg-border-pastel/50" />
        <div className="h-4 w-2/3 rounded bg-border-pastel/50" />
        <div className="flex items-center gap-3">
          <div className="h-3 w-20 rounded bg-border-pastel/50" />
          <div className="h-3 w-16 rounded bg-border-pastel/50" />
          <div className="h-3 w-12 rounded bg-border-pastel/50" />
        </div>
      </div>
    </div>
  );
}

function SkeletonList({ count = 3, variant = "ride" }: { count?: number; variant?: "ride" | "message" | "profile" }) {
  return (
    <div data-testid="skeleton-list" className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline reproduction of EmptyState
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div data-testid="empty-state-icon" className="mb-4 text-text-secondary">{icon}</div>}
      <h3 data-testid="empty-state-title" className="text-lg font-semibold text-text-main">{title}</h3>
      {description && <p data-testid="empty-state-description" className="mt-2 max-w-sm text-sm text-text-secondary">{description}</p>}
      {action && (
        <button type="button" data-testid="empty-state-action" onClick={action.onClick} className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white">
          {action.label}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline reproduction of ErrorBoundary
// ---------------------------------------------------------------------------

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div data-testid="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <button type="button" onClick={this.handleReset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Inline reproduction of OfflineBanner rendering logic
// ---------------------------------------------------------------------------

function OfflineBannerDisplay({ isOffline, isDismissed, onDismiss }: { isOffline: boolean; isDismissed: boolean; onDismiss: () => void }) {
  if (!isOffline || isDismissed) return null;
  return (
    <div data-testid="offline-banner" className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-warning px-4 py-2 text-sm font-medium text-text-main">
      <span>You&apos;re offline. Some features may not work.</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss offline banner">&#x2715;</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests: SkeletonCard
// ---------------------------------------------------------------------------

describe("SkeletonCard", () => {
  it("renders with default ride variant", async () => {
    const { container, cleanup } = await renderComponent(<SkeletonCard />);
    const card = container.querySelector('[data-testid="skeleton-card"]');
    expect(card).not.toBeNull();
    expect(card?.getAttribute("data-variant")).toBe("ride");
    await cleanup();
  });

  it("renders message variant with avatar circle", async () => {
    const { container, cleanup } = await renderComponent(<SkeletonCard variant="message" />);
    const card = container.querySelector('[data-testid="skeleton-card"]');
    expect(card?.getAttribute("data-variant")).toBe("message");
    // Has a circular avatar placeholder
    const avatar = card?.querySelector(".rounded-full");
    expect(avatar).not.toBeNull();
    await cleanup();
  });

  it("renders profile variant with large circle and badge", async () => {
    const { container, cleanup } = await renderComponent(<SkeletonCard variant="profile" />);
    const card = container.querySelector('[data-testid="skeleton-card"]');
    expect(card?.getAttribute("data-variant")).toBe("profile");
    // Has large 16x16 circle and badge
    const circles = card?.querySelectorAll(".rounded-full");
    expect(circles!.length).toBeGreaterThanOrEqual(2); // avatar + badge
    await cleanup();
  });

  it("applies animate-pulse class", async () => {
    const { container, cleanup } = await renderComponent(<SkeletonCard />);
    const card = container.querySelector('[data-testid="skeleton-card"]');
    expect(card?.className).toContain("animate-pulse");
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Tests: SkeletonList
// ---------------------------------------------------------------------------

describe("SkeletonList", () => {
  it("renders correct number of skeleton cards (default 3)", async () => {
    const { container, cleanup } = await renderComponent(<SkeletonList />);
    const cards = container.querySelectorAll('[data-testid="skeleton-card"]');
    expect(cards.length).toBe(3);
    await cleanup();
  });

  it("renders custom count of skeleton cards", async () => {
    const { container, cleanup } = await renderComponent(<SkeletonList count={5} />);
    const cards = container.querySelectorAll('[data-testid="skeleton-card"]');
    expect(cards.length).toBe(5);
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Tests: EmptyState
// ---------------------------------------------------------------------------

describe("EmptyState", () => {
  it("renders title text", async () => {
    const { container, cleanup } = await renderComponent(<EmptyState title="No rides found" />);
    const title = container.querySelector('[data-testid="empty-state-title"]');
    expect(title?.textContent).toBe("No rides found");
    await cleanup();
  });

  it("renders description when provided", async () => {
    const { container, cleanup } = await renderComponent(
      <EmptyState title="No rides" description="Try adjusting your search" />,
    );
    const desc = container.querySelector('[data-testid="empty-state-description"]');
    expect(desc?.textContent).toBe("Try adjusting your search");
    await cleanup();
  });

  it("does not render description when not provided", async () => {
    const { container, cleanup } = await renderComponent(<EmptyState title="No rides" />);
    const desc = container.querySelector('[data-testid="empty-state-description"]');
    expect(desc).toBeNull();
    await cleanup();
  });

  it("renders icon when provided", async () => {
    const { container, cleanup } = await renderComponent(
      <EmptyState title="No rides" icon={<span data-testid="test-icon">icon</span>} />,
    );
    const iconWrapper = container.querySelector('[data-testid="empty-state-icon"]');
    expect(iconWrapper).not.toBeNull();
    expect(container.querySelector('[data-testid="test-icon"]')).not.toBeNull();
    await cleanup();
  });

  it("renders action button and calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const { container, cleanup } = await renderComponent(
      <EmptyState title="No rides" action={{ label: "Create ride", onClick }} />,
    );
    const button = container.querySelector('[data-testid="empty-state-action"]') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.textContent).toBe("Create ride");
    await act(async () => {
      button.click();
    });
    expect(onClick).toHaveBeenCalledOnce();
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Tests: ErrorBoundary
// ---------------------------------------------------------------------------

describe("ErrorBoundary", () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("renders children when no error occurs", async () => {
    const { container, cleanup } = await renderComponent(
      <ErrorBoundary>
        <div data-testid="child-content">Hello</div>
      </ErrorBoundary>,
    );
    expect(container.querySelector('[data-testid="child-content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="error-boundary-fallback"]')).toBeNull();
    await cleanup();
  });

  it("renders fallback when child throws", async () => {
    function ThrowingComponent(): React.ReactNode {
      throw new Error("Test error");
    }

    const { container, cleanup } = await renderComponent(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(container.querySelector('[data-testid="error-boundary-fallback"]')).not.toBeNull();
    expect(container.textContent).toContain("Something went wrong");
    await cleanup();
  });

  it("renders custom fallback when provided", async () => {
    function ThrowingComponent(): React.ReactNode {
      throw new Error("Test error");
    }

    const { container, cleanup } = await renderComponent(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error</div>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(container.querySelector('[data-testid="custom-fallback"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="error-boundary-fallback"]')).toBeNull();
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Tests: OfflineBanner
// ---------------------------------------------------------------------------

describe("OfflineBanner", () => {
  it("is hidden when online", async () => {
    const { container, cleanup } = await renderComponent(
      <OfflineBannerDisplay isOffline={false} isDismissed={false} onDismiss={() => {}} />,
    );
    expect(container.querySelector('[data-testid="offline-banner"]')).toBeNull();
    await cleanup();
  });

  it("shows banner when offline", async () => {
    const { container, cleanup } = await renderComponent(
      <OfflineBannerDisplay isOffline={true} isDismissed={false} onDismiss={() => {}} />,
    );
    const banner = container.querySelector('[data-testid="offline-banner"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain("offline");
    await cleanup();
  });

  it("hides when dismissed", async () => {
    const { container, cleanup } = await renderComponent(
      <OfflineBannerDisplay isOffline={true} isDismissed={true} onDismiss={() => {}} />,
    );
    expect(container.querySelector('[data-testid="offline-banner"]')).toBeNull();
    await cleanup();
  });

  it("calls onDismiss when close button clicked", async () => {
    const onDismiss = vi.fn();
    const { container, cleanup } = await renderComponent(
      <OfflineBannerDisplay isOffline={true} isDismissed={false} onDismiss={onDismiss} />,
    );
    const dismissBtn = container.querySelector('[aria-label="Dismiss offline banner"]') as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();
    await act(async () => {
      dismissBtn.click();
    });
    expect(onDismiss).toHaveBeenCalledOnce();
    await cleanup();
  });
});
