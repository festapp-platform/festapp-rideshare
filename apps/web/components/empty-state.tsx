/**
 * Reusable empty state component (PLAT-07).
 *
 * Centered layout with optional icon, title, description, and action button.
 * Used when lists or pages have no data to display.
 */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div data-testid="empty-state-icon" className="mb-4 text-text-secondary" style={{ fontSize: 64 }}>
          {icon}
        </div>
      )}
      <h3 data-testid="empty-state-title" className="text-lg font-semibold text-text-main">
        {title}
      </h3>
      {description && (
        <p data-testid="empty-state-description" className="mt-2 max-w-sm text-sm text-text-secondary">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          data-testid="empty-state-action"
          onClick={action.onClick}
          className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
