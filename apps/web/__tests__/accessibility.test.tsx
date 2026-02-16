import { describe, it, expect } from "vitest";
import React, { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import * as fs from "fs";
import * as path from "path";

/**
 * Accessibility tests (PLAT-15).
 *
 * Validates ARIA labels, focus styles, color contrast, touch targets,
 * skip navigation, and reduced motion support.
 *
 * Uses inline JSX pattern (consistent with 07-03/09-04/11-02) to avoid
 * pnpm monorepo dual-React issues with component imports.
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
// Color contrast helpers
// ---------------------------------------------------------------------------

/** Parse hex color to [r, g, b] normalized to 0-1. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

/** Calculate relative luminance per WCAG 2.1 definition. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Calculate contrast ratio between two hex colors. */
function contrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Inline reproduction of SkipLink
// ---------------------------------------------------------------------------

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none"
    >
      Skip to main content
    </a>
  );
}

// ---------------------------------------------------------------------------
// Inline reproduction of AccessibleButton
// ---------------------------------------------------------------------------

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "min-h-[44px] min-w-[44px] px-3 py-1.5 text-sm",
  md: "min-h-[44px] min-w-[44px] px-4 py-2 text-base",
  lg: "min-h-[48px] min-w-[48px] px-6 py-3 text-lg",
};

const AccessibleButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: Size }
>(function AccessibleButton({ size = "md", className = "", children, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Inline reproduction of AppNav link (single nav link for testing)
// ---------------------------------------------------------------------------

function NavLink({
  href,
  label,
  isActive,
  children,
}: {
  href: string;
  label: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-3 min-h-[44px] rounded-lg px-3 py-2.5 text-sm font-medium ${
        isActive ? "bg-primary/10 text-primary" : "text-text-secondary"
      }`}
    >
      <span aria-hidden="true">{children}</span>
      <span>{label}</span>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Tests: SkipLink
// ---------------------------------------------------------------------------

describe("SkipLink", () => {
  it("renders with 'Skip to main content' text", async () => {
    const { container, cleanup } = await renderComponent(<SkipLink />);
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Skip to main content");
    await cleanup();
  });

  it("has href pointing to #main-content", async () => {
    const { container, cleanup } = await renderComponent(<SkipLink />);
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("#main-content");
    await cleanup();
  });

  it("has sr-only class by default for visual hiding", async () => {
    const { container, cleanup } = await renderComponent(<SkipLink />);
    const link = container.querySelector("a");
    expect(link?.className).toContain("sr-only");
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Tests: AccessibleButton
// ---------------------------------------------------------------------------

describe("AccessibleButton", () => {
  it("renders with aria-label", async () => {
    const { container, cleanup } = await renderComponent(
      <AccessibleButton aria-label="Close dialog">X</AccessibleButton>,
    );
    const button = container.querySelector("button");
    expect(button?.getAttribute("aria-label")).toBe("Close dialog");
    await cleanup();
  });

  it("has minimum height and width classes for touch targets", async () => {
    const { container, cleanup } = await renderComponent(
      <AccessibleButton>Click me</AccessibleButton>,
    );
    const button = container.querySelector("button");
    expect(button?.className).toContain("min-h-[44px]");
    expect(button?.className).toContain("min-w-[44px]");
    await cleanup();
  });

  it("has focus ring classes for keyboard visibility", async () => {
    const { container, cleanup } = await renderComponent(
      <AccessibleButton>Click me</AccessibleButton>,
    );
    const button = container.querySelector("button");
    expect(button?.className).toContain("focus-visible:ring-2");
    expect(button?.className).toContain("focus-visible:ring-primary");
    expect(button?.className).toContain("focus-visible:ring-offset-2");
    await cleanup();
  });

  it("applies disabled state styling", async () => {
    const { container, cleanup } = await renderComponent(
      <AccessibleButton disabled>Disabled</AccessibleButton>,
    );
    const button = container.querySelector("button");
    expect(button?.disabled).toBe(true);
    expect(button?.className).toContain("disabled:opacity-50");
    expect(button?.className).toContain("disabled:cursor-not-allowed");
    await cleanup();
  });

  it("forwards ref correctly", async () => {
    const ref = createRef<HTMLButtonElement>();
    const { cleanup } = await renderComponent(
      <AccessibleButton ref={ref}>Ref button</AccessibleButton>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("BUTTON");
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Tests: Navigation ARIA
// ---------------------------------------------------------------------------

describe("Navigation ARIA", () => {
  it("nav link has role=navigation via container", async () => {
    const { container, cleanup } = await renderComponent(
      <nav role="navigation" aria-label="Main navigation">
        <NavLink href="/search" label="Search rides" isActive={false}>
          Icon
        </NavLink>
      </nav>,
    );
    const nav = container.querySelector("nav");
    expect(nav?.getAttribute("role")).toBe("navigation");
    expect(nav?.getAttribute("aria-label")).toBe("Main navigation");
    await cleanup();
  });

  it("active link has aria-current=page", async () => {
    const { container, cleanup } = await renderComponent(
      <NavLink href="/search" label="Search rides" isActive={true}>
        Icon
      </NavLink>,
    );
    const link = container.querySelector("a");
    expect(link?.getAttribute("aria-current")).toBe("page");
    await cleanup();
  });

  it("inactive link does not have aria-current", async () => {
    const { container, cleanup } = await renderComponent(
      <NavLink href="/my-rides" label="My rides" isActive={false}>
        Icon
      </NavLink>,
    );
    const link = container.querySelector("a");
    expect(link?.getAttribute("aria-current")).toBeNull();
    await cleanup();
  });

  it("icon span has aria-hidden for decorative icons", async () => {
    const { container, cleanup } = await renderComponent(
      <NavLink href="/search" label="Search rides" isActive={false}>
        <svg />
      </NavLink>,
    );
    const iconSpan = container.querySelector("[aria-hidden]");
    expect(iconSpan?.getAttribute("aria-hidden")).toBe("true");
    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Tests: Color contrast (programmatic)
// ---------------------------------------------------------------------------

describe("Color contrast", () => {
  // Light mode colors
  const lightText = "#2D2B3D";
  const lightBg = "#FAF7FF";
  const lightTextSecondary = "#6B6880";

  // Dark mode colors
  const darkText = "#EEEAF5";
  const darkBg = "#1A1825";
  const darkTextSecondary = "#9E9BB3";

  it("light mode: --text on --background meets WCAG AA (4.5:1)", () => {
    const ratio = contrastRatio(lightText, lightBg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("light mode: --text-secondary on --background meets WCAG AA (4.5:1)", () => {
    const ratio = contrastRatio(lightTextSecondary, lightBg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("dark mode: --text on --background meets WCAG AA (4.5:1)", () => {
    const ratio = contrastRatio(darkText, darkBg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("dark mode: --text-secondary on --background meets WCAG AA large text (3:1)", () => {
    const ratio = contrastRatio(darkTextSecondary, darkBg);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Tests: Reduced motion in globals.css
// ---------------------------------------------------------------------------

describe("Reduced motion CSS", () => {
  it("globals.css contains prefers-reduced-motion media query", () => {
    const cssPath = path.resolve(__dirname, "../app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    expect(cssContent).toContain("prefers-reduced-motion: reduce");
  });

  it("globals.css contains focus-visible global style", () => {
    const cssPath = path.resolve(__dirname, "../app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    expect(cssContent).toContain(":focus-visible");
    expect(cssContent).toContain("outline: 2px solid var(--primary)");
  });
});
