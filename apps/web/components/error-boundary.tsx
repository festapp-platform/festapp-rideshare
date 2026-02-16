"use client";

import React from "react";

/**
 * React error boundary component (PLAT-07).
 *
 * Catches render errors in child components and displays a fallback UI
 * with a "Try again" button to re-render the children.
 * Must be a class component (React error boundaries require getDerivedStateFromError).
 */

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          data-testid="error-boundary-fallback"
          className="mx-auto mt-12 max-w-md rounded-2xl border border-border-pastel bg-surface p-8 text-center shadow-sm"
        >
          <div className="mb-4 text-4xl">!</div>
          <h2 className="text-lg font-semibold text-text-main">Something went wrong</h2>
          <p className="mt-2 text-sm text-text-secondary">
            An unexpected error occurred. Please try again.
          </p>
          {this.state.error?.message && (
            <p className="mt-3 rounded-lg bg-background px-3 py-2 text-xs text-text-secondary">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
