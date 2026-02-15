"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PlaceResult {
  lat: number;
  lng: number;
  address: string;
  placeId: string;
}

interface MapySuggestion {
  name: string;
  label: string;
  position: { lon: number; lat: number };
  location?: string;
  type?: string;
}

interface AddressAutocompleteMapyProps {
  label?: string;
  placeholder?: string;
  onPlaceSelect?: (place: PlaceResult) => void;
  onSelect?: (place: PlaceResult) => void;
  defaultValue?: string;
  value?: string;
  className?: string;
}

const MAPY_API_KEY = process.env.NEXT_PUBLIC_MAPY_CZ_API_KEY ?? "";

/**
 * Address autocomplete using Mapy.cz Geocode/Suggest API.
 * Region-biased toward Czech Republic and Slovakia.
 * Same PlaceResult interface as the Google variant for drop-in replacement.
 */
export function AddressAutocompleteMapy({
  label,
  placeholder = "Enter address",
  onPlaceSelect,
  onSelect,
  defaultValue,
  value: controlledValue,
  className,
}: AddressAutocompleteMapyProps) {
  const [inputValue, setInputValue] = useState(
    controlledValue ?? defaultValue ?? "",
  );
  const [suggestions, setSuggestions] = useState<MapySuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInputValue(controlledValue);
    }
  }, [controlledValue]);

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

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const url = new URL("https://api.mapy.cz/v1/suggest");
      url.searchParams.set("apikey", MAPY_API_KEY);
      url.searchParams.set("query", input);
      url.searchParams.set("lang", "cs");
      url.searchParams.set("limit", "5");
      url.searchParams.set("type", "regional");
      url.searchParams.set(
        "locality",
        "cz,sk",
      );

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Suggest API failed");

      const data = await res.json();
      const items: MapySuggestion[] = data.items ?? data.result ?? [];
      setSuggestions(items);
      setIsOpen(items.length > 0);
    } catch {
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setInputValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }

  function handleSelect(suggestion: MapySuggestion) {
    const displayText = suggestion.location
      ? `${suggestion.name}, ${suggestion.location}`
      : suggestion.name;

    handlePlaceSelect({
      lat: suggestion.position.lat,
      lng: suggestion.position.lon,
      address: displayText,
      placeId: `mapy-${suggestion.position.lat}-${suggestion.position.lon}`,
    });

    setInputValue(displayText);
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
              <div className="font-medium">{suggestion.name}</div>
              {suggestion.location && (
                <div className="text-xs text-text-secondary">
                  {suggestion.location}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
