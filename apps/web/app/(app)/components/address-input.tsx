"use client";

import { getMapProvider } from "@/lib/map-provider";
import {
  AddressAutocomplete as GoogleAutocomplete,
  type PlaceResult,
} from "./address-autocomplete";
import { AddressAutocompleteMapy } from "./address-autocomplete-mapy";

export type { PlaceResult };

interface AddressInputProps {
  label?: string;
  placeholder?: string;
  onPlaceSelect?: (place: PlaceResult) => void;
  onSelect?: (place: PlaceResult) => void;
  defaultValue?: string;
  value?: string;
  className?: string;
}

/**
 * Provider-agnostic address autocomplete input.
 * Uses Google Places or Mapy.cz Suggest based on NEXT_PUBLIC_MAP_PROVIDER.
 */
export function AddressInput(props: AddressInputProps) {
  const provider = getMapProvider();

  if (provider === "mapy") {
    return <AddressAutocompleteMapy {...props} />;
  }

  return <GoogleAutocomplete {...props} />;
}
