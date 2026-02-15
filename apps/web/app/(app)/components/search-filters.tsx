'use client';

import { useState } from 'react';

/**
 * Client-side filter and sort controls for search results.
 *
 * The nearby_rides RPC handles geospatial filtering. These controls
 * refine results client-side by price, booking mode, seats, and sort order.
 */

export type SortOption = 'departure' | 'price' | 'rating' | 'distance';
export type BookingFilter = 'all' | 'instant' | 'request';

export interface SearchFilters {
  sort: SortOption;
  minPrice: number | null;
  maxPrice: number | null;
  bookingMode: BookingFilter;
  minSeats: number;
}

export const DEFAULT_FILTERS: SearchFilters = {
  sort: 'departure',
  minPrice: null,
  maxPrice: null,
  bookingMode: 'all',
  minSeats: 1,
};

interface SearchFiltersBarProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
}

export function SearchFiltersBar({
  filters,
  onFilterChange,
}: SearchFiltersBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const update = (patch: Partial<SearchFilters>) => {
    onFilterChange({ ...filters, ...patch });
  };

  return (
    <div className="rounded-2xl border border-border-pastel bg-surface p-3 shadow-sm md:p-4">
      {/* Always visible: sort + mobile toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text-secondary">
            Sort by
          </label>
          <select
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as SortOption })}
            className="rounded-lg border border-border-pastel bg-background px-3 py-1.5 text-xs text-text-main focus:border-primary focus:outline-none"
          >
            <option value="departure">Earliest departure</option>
            <option value="price">Lowest price</option>
            <option value="rating">Highest rated</option>
            <option value="distance">Closest pickup</option>
          </select>
        </div>

        {/* Mobile filter toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-medium text-primary md:hidden"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
        </button>

        {/* Desktop filters (always visible) */}
        <div className="hidden items-center gap-3 md:flex">
          <FilterControls filters={filters} onUpdate={update} />
        </div>
      </div>

      {/* Mobile filters (collapsible) */}
      {isExpanded && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border-pastel pt-3 md:hidden">
          <FilterControls filters={filters} onUpdate={update} />
        </div>
      )}
    </div>
  );
}

/** Shared filter inputs used in both desktop and mobile layouts. */
function FilterControls({
  filters,
  onUpdate,
}: {
  filters: SearchFilters;
  onUpdate: (patch: Partial<SearchFilters>) => void;
}) {
  return (
    <>
      {/* Price range */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-text-secondary">Price</label>
        <input
          type="number"
          placeholder="Min"
          value={filters.minPrice ?? ''}
          onChange={(e) =>
            onUpdate({
              minPrice: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="w-16 rounded-lg border border-border-pastel bg-background px-2 py-1.5 text-xs text-text-main focus:border-primary focus:outline-none"
          min={0}
        />
        <span className="text-xs text-text-secondary">-</span>
        <input
          type="number"
          placeholder="Max"
          value={filters.maxPrice ?? ''}
          onChange={(e) =>
            onUpdate({
              maxPrice: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="w-16 rounded-lg border border-border-pastel bg-background px-2 py-1.5 text-xs text-text-main focus:border-primary focus:outline-none"
          min={0}
        />
        <span className="text-xs text-text-secondary">CZK</span>
      </div>

      {/* Booking mode */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-text-secondary">Booking</label>
        <select
          value={filters.bookingMode}
          onChange={(e) =>
            onUpdate({ bookingMode: e.target.value as BookingFilter })
          }
          className="rounded-lg border border-border-pastel bg-background px-2 py-1.5 text-xs text-text-main focus:border-primary focus:outline-none"
        >
          <option value="all">All</option>
          <option value="instant">Instant only</option>
          <option value="request">Request only</option>
        </select>
      </div>

      {/* Min seats */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-text-secondary">Min seats</label>
        <input
          type="number"
          value={filters.minSeats}
          onChange={(e) =>
            onUpdate({ minSeats: Math.max(1, Number(e.target.value) || 1) })
          }
          className="w-14 rounded-lg border border-border-pastel bg-background px-2 py-1.5 text-xs text-text-main focus:border-primary focus:outline-none"
          min={1}
          max={8}
        />
      </div>
    </>
  );
}
