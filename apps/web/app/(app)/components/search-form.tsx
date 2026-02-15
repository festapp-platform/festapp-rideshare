'use client';

import { useState } from 'react';
import { AddressAutocomplete, type PlaceResult } from './address-autocomplete';
import type { SearchParams } from '@festapp/shared';

/**
 * Search form with origin/destination autocomplete and date picker.
 *
 * Validates with SearchRidesSchema from shared package and calls
 * onSearch with the geocoded parameters for the nearby_rides RPC.
 */

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
  /** Initial values from URL search params */
  initialOrigin?: string;
  initialDestination?: string;
  initialDate?: string;
}

export function SearchForm({
  onSearch,
  isLoading,
  initialOrigin,
  initialDestination,
  initialDate,
}: SearchFormProps) {
  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [searchDate, setSearchDate] = useState(
    initialDate ?? new Date().toISOString().split('T')[0],
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!origin) {
      setError('Please select a pickup location');
      return;
    }
    if (!destination) {
      setError('Please select a destination');
      return;
    }
    if (!searchDate) {
      setError('Please select a date');
      return;
    }

    onSearch({
      originLat: origin.lat,
      originLng: origin.lng,
      destLat: destination.lat,
      destLng: destination.lng,
      searchDate,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border-pastel bg-surface p-4 shadow-sm md:p-6"
    >
      {/* Origin and Destination - side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <AddressAutocomplete
          label="From"
          placeholder="Pickup location"
          value={initialOrigin}
          onSelect={setOrigin}
        />
        <AddressAutocomplete
          label="To"
          placeholder="Destination"
          value={initialDestination}
          onSelect={setDestination}
        />
      </div>

      {/* Date and Search button */}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end md:mt-4">
        <div className="flex-1 sm:max-w-48">
          <label className="mb-1 block text-sm font-medium text-text-main">
            Date
          </label>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full rounded-xl border border-border-pastel bg-surface px-4 py-2.5 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-error">{error}</p>
      )}
    </form>
  );
}
