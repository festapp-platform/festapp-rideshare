"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

export interface PlaceResult {
  lat: number;
  lng: number;
  address: string;
  placeId: string;
}

interface AddressAutocompleteProps {
  /** Optional label above the input */
  label?: string;
  placeholder?: string;
  onPlaceSelect?: (place: PlaceResult) => void;
  /** Legacy callback name -- same as onPlaceSelect */
  onSelect?: (place: PlaceResult) => void;
  defaultValue?: string;
  /** Controlled value (sets input text externally) */
  value?: string;
  className?: string;
}

/**
 * Google Places autocomplete input using the new Places API.
 * Uses fetchAutocompleteSuggestions (not the legacy Autocomplete widget).
 *
 * Features:
 * - 300ms debounce on input
 * - Region bias toward CZ/SK
 * - Click-outside closes dropdown
 * - Fetches place details (lat/lng) on selection
 */
export function AddressAutocomplete({
  label,
  placeholder = "Enter address",
  onPlaceSelect,
  onSelect,
  defaultValue,
  value: controlledValue,
  className,
}: AddressAutocompleteProps) {
  const places = useMapsLibrary("places");
  const [inputValue, setInputValue] = useState(
    controlledValue ?? defaultValue ?? "",
  );
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInputValue(controlledValue);
    }
  }, [controlledValue]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePlaceSelect = useCallback(
    (place: PlaceResult) => {
      onPlaceSelect?.(place);
      onSelect?.(place);
    },
    [onPlaceSelect, onSelect],
  );

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!places || input.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const request = {
          input,
          includedRegionCodes: ["cz", "sk"],
        };

        const { suggestions: results } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            request,
          );
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    [places],
  );

  function handleInputChange(value: string) {
    setInputValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }

  async function handleSelect(
    suggestion: google.maps.places.AutocompleteSuggestion,
  ) {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;

    // Fetch place details (location coordinates)
    const place = prediction.toPlace();
    await place.fetchFields({
      fields: ["location", "formattedAddress"],
    });

    const location = place.location;
    if (location) {
      handlePlaceSelect({
        lat: location.lat(),
        lng: location.lng(),
        address: place.formattedAddress ?? prediction.text.text,
        placeId: place.id,
      });
    }

    setInputValue(place.formattedAddress ?? prediction.text.text);
    setIsOpen(false);
    setSuggestions([]);
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-text-main">
          {label}
        </label>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
      />
      {isLoading && (
        <div className="absolute right-3 top-[50%] -translate-y-1/2 text-xs text-text-secondary">
          ...
        </div>
      )}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border-pastel bg-surface shadow-lg">
          {suggestions.map((suggestion, idx) => (
            <li
              key={idx}
              onMouseDown={() => handleSelect(suggestion)}
              className="cursor-pointer px-4 py-2.5 text-sm text-text-main transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-primary/5"
            >
              {suggestion.placePrediction?.text.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
