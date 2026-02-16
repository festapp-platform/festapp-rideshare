"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

/**
 * Accessible button component with enforced ARIA best practices (PLAT-15).
 *
 * Features:
 * - Minimum 44x44px touch target (WCAG 2.5.8)
 * - Visible focus ring for keyboard users
 * - Disabled state styling
 * - Forwarded ref for composability
 *
 * Existing buttons don't need to migrate immediately, but new features
 * should use this component for consistent accessibility.
 */

type Size = "sm" | "md" | "lg";

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button size variant. Defaults to "md". */
  size?: Size;
}

const sizeClasses: Record<Size, string> = {
  sm: "min-h-[44px] min-w-[44px] px-3 py-1.5 text-sm",
  md: "min-h-[44px] min-w-[44px] px-4 py-2 text-base",
  lg: "min-h-[48px] min-w-[48px] px-6 py-3 text-lg",
};

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  function AccessibleButton({ size = "md", className = "", children, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
