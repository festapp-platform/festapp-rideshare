'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { searchNearbyRides } from '@festapp/shared';
import type { SearchParams, NearbyRideResult } from '@festapp/shared';
import { SearchForm } from '../components/search-form';
import { RideCard } from '../components/ride-card';
import {
  SearchFiltersBar,
  DEFAULT_FILTERS,
  type SearchFilters,
  type SortOption,
} from '../components/search-filters';

/**
 * Search page -- the main passenger experience.
 *
 * Calls the nearby_rides RPC for geospatial corridor matching,
 * then applies client-side filtering and sorting on the results.
 * Search params are persisted in the URL for shareability.
 */
export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [results, setResults] = useState<NearbyRideResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);

  // Read initial values from URL params
  const initialOrigin = searchParams.get('origin') ?? undefined;
  const initialDest = searchParams.get('dest') ?? undefined;
  const initialDate = searchParams.get('date') ?? undefined;

  const handleSearch = useCallback(
    async (params: SearchParams) => {
      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      // Persist search params in URL
      const url = new URLSearchParams();
      url.set('originLat', String(params.originLat));
      url.set('originLng', String(params.originLng));
      url.set('destLat', String(params.destLat));
      url.set('destLng', String(params.destLng));
      url.set('date', params.searchDate);
      router.replace(`/search?${url.toString()}`, { scroll: false });

      try {
        const { data, error: rpcError } = await searchNearbyRides(
          supabase,
          params,
        );

        if (rpcError) {
          setError('Search failed. Please try again.');
          setResults([]);
          return;
        }

        setResults(data ?? []);
      } catch {
        setError('An unexpected error occurred. Please try again.');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, router],
  );

  // Apply client-side filters and sorting
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    // Price filter
    if (filters.minPrice != null) {
      filtered = filtered.filter(
        (r) => r.price_czk != null && r.price_czk >= filters.minPrice!,
      );
    }
    if (filters.maxPrice != null) {
      filtered = filtered.filter(
        (r) => r.price_czk != null && r.price_czk <= filters.maxPrice!,
      );
    }

    // Booking mode filter
    if (filters.bookingMode !== 'all') {
      filtered = filtered.filter(
        (r) => r.booking_mode === filters.bookingMode,
      );
    }

    // Min seats filter
    if (filters.minSeats > 1) {
      filtered = filtered.filter(
        (r) => r.seats_available >= filters.minSeats,
      );
    }

    // Sorting
    const sortFns: Record<
      SortOption,
      (a: NearbyRideResult, b: NearbyRideResult) => number
    > = {
      departure: (a, b) =>
        new Date(a.departure_time).getTime() -
        new Date(b.departure_time).getTime(),
      price: (a, b) => (a.price_czk ?? 0) - (b.price_czk ?? 0),
      rating: (a, b) => b.driver_rating - a.driver_rating,
      distance: (a, b) => a.origin_distance_m - b.origin_distance_m,
    };

    filtered.sort(sortFns[filters.sort]);

    return filtered;
  }, [results, filters]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Search Rides</h1>

      <SearchForm
        onSearch={handleSearch}
        isLoading={isLoading}
        initialOrigin={initialOrigin}
        initialDestination={initialDest}
        initialDate={initialDate}
      />

      {/* Filters -- only show after first search */}
      {hasSearched && !isLoading && results.length > 0 && (
        <div className="mt-4">
          <SearchFiltersBar filters={filters} onFilterChange={setFilters} />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-6 rounded-2xl border border-error/20 bg-error/5 p-6 text-center">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-border-pastel bg-surface p-5"
            >
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-border-pastel" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-border-pastel" />
                  <div className="h-3 w-1/2 rounded bg-border-pastel" />
                  <div className="h-3 w-1/3 rounded bg-border-pastel" />
                </div>
                <div className="h-6 w-20 rounded bg-border-pastel" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && hasSearched && !error && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-text-secondary">
            {filteredResults.length}{' '}
            {filteredResults.length === 1 ? 'ride' : 'rides'} found
          </p>

          {filteredResults.length > 0 ? (
            <div className="space-y-3">
              {filteredResults.map((ride) => (
                <RideCard key={ride.ride_id} ride={ride} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border-pastel bg-surface p-12 text-center">
              <span className="mb-2 block text-4xl">
                <svg
                  className="mx-auto h-12 w-12 text-text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </span>
              <h2 className="mb-2 text-lg font-bold text-text-main">
                No rides found
              </h2>
              <p className="text-sm text-text-secondary">
                Try expanding your search radius or changing the date.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial state -- before first search */}
      {!hasSearched && !isLoading && (
        <div className="mt-8 text-center">
          <p className="text-sm text-text-secondary">
            Search for rides to festivals, events, and more
          </p>
        </div>
      )}
    </div>
  );
}
