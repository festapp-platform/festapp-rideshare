'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PlaceResult } from './address-input';

// ─── Types ────────────────────────────────────────────────────────────────

interface FavoriteRoute {
  id: string;
  origin_address: string;
  destination_address: string;
  origin_location: unknown;
  destination_location: unknown;
  label: string | null;
  alert_enabled: boolean;
}

interface SaveRouteButtonProps {
  origin: PlaceResult;
  destination: PlaceResult;
  /** Called after save/unsave so parent can refresh lists */
  onToggle?: () => void;
}

interface FavoriteRoutesListProps {
  /** Called when a saved route is clicked -- prefills search */
  onRouteSelect: (origin: PlaceResult, destination: PlaceResult) => void;
}

// ─── SaveRouteButton ──────────────────────────────────────────────────────

/**
 * Heart icon button to save/unsave a route to favorites.
 * Checks on mount if the route is already saved (matching origin + dest addresses).
 */
export function SaveRouteButton({
  origin,
  destination,
  onToggle,
}: SaveRouteButtonProps) {
  const supabase = createClient();
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [label, setLabel] = useState('');

  // Check if already saved
  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('favorite_routes')
        .select('id')
        .eq('user_id', user.id)
        .eq('origin_address', origin.address)
        .eq('destination_address', destination.address)
        .maybeSingle();

      if (data) {
        setIsSaved(true);
        setSavedId(data.id);
      }
    }
    check();
  }, [supabase, origin.address, destination.address]);

  async function handleToggle() {
    if (isLoading) return;

    if (isSaved && savedId) {
      // Unsave
      setIsLoading(true);
      await supabase.from('favorite_routes').delete().eq('id', savedId);
      setIsSaved(false);
      setSavedId(null);
      setIsLoading(false);
      onToggle?.();
    } else {
      // Show label input before saving
      if (!showLabel) {
        setShowLabel(true);
        return;
      }
      // Save
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('favorite_routes')
        .insert({
          user_id: user.id,
          origin_location: `POINT(${origin.lng} ${origin.lat})`,
          origin_address: origin.address,
          destination_location: `POINT(${destination.lng} ${destination.lat})`,
          destination_address: destination.address,
          label: label.trim() || null,
        })
        .select('id')
        .single();

      if (data) {
        setIsSaved(true);
        setSavedId(data.id);
      }
      setShowLabel(false);
      setLabel('');
      setIsLoading(false);
      onToggle?.();
    }
  }

  return (
    <div className="flex items-center gap-2">
      {showLabel && !isSaved && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Home to Work)"
            className="w-40 rounded-lg border border-border-pastel bg-background px-2 py-1 text-xs text-text-main placeholder:text-text-secondary focus:border-primary focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleToggle();
              }
            }}
          />
          <button
            onClick={handleToggle}
            disabled={isLoading}
            className="rounded-lg bg-primary px-2 py-1 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => setShowLabel(false)}
            className="text-xs text-text-secondary hover:text-text-main"
          >
            Cancel
          </button>
        </div>
      )}
      {!showLabel && (
        <button
          onClick={handleToggle}
          disabled={isLoading}
          aria-label={isSaved ? 'Remove from favorites' : 'Save route'}
          className="flex items-center gap-1 rounded-lg p-1.5 text-sm transition-colors hover:bg-primary/5 disabled:opacity-50"
        >
          <svg
            className={`h-5 w-5 ${isSaved ? 'fill-primary text-primary' : 'text-text-secondary'}`}
            viewBox="0 0 24 24"
            fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <span className="text-xs text-text-secondary">
            {isSaved ? 'Saved' : 'Save route'}
          </span>
        </button>
      )}
    </div>
  );
}

// ─── FavoriteRoutesList ───────────────────────────────────────────────────

/**
 * List of user's favorite routes with click-to-search, alert toggle, and delete.
 * Shown on the search page for quick access to saved routes.
 * Alert toggle enables push notifications when new rides match the route.
 */
export function FavoriteRoutesList({ onRouteSelect }: FavoriteRoutesListProps) {
  const supabase = createClient();
  const [routes, setRoutes] = useState<FavoriteRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingAlert, setTogglingAlert] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('favorite_routes')
      .select('id, origin_address, destination_address, origin_location, destination_location, label, alert_enabled')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setRoutes(data ?? []);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  async function handleDelete(id: string) {
    await supabase.from('favorite_routes').delete().eq('id', id);
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleToggleAlert(id: string, currentValue: boolean) {
    if (togglingAlert) return;
    setTogglingAlert(id);

    // Optimistic update
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, alert_enabled: !currentValue } : r,
      ),
    );

    const { error } = await supabase
      .from('favorite_routes')
      .update({ alert_enabled: !currentValue })
      .eq('id', id);

    if (error) {
      // Revert on error
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, alert_enabled: currentValue } : r,
        ),
      );
      console.error('Failed to toggle alert:', error.message);
    }

    setTogglingAlert(null);
  }

  function handleSelect(route: FavoriteRoute) {
    // We don't have coordinates stored in a client-readable way (PostGIS binary),
    // so we pass the addresses and let the search form re-geocode via autocomplete.
    // For now, we pass dummy coords -- the search form uses address text to populate.
    onRouteSelect(
      {
        lat: 0,
        lng: 0,
        address: route.origin_address,
        placeId: '',
      },
      {
        lat: 0,
        lng: 0,
        address: route.destination_address,
        placeId: '',
      },
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 w-24 rounded bg-border-pastel" />
        <div className="h-10 rounded-xl bg-border-pastel" />
      </div>
    );
  }

  if (routes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border-pastel bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-main">
        Saved Routes
      </h3>
      <div className="space-y-2">
        {routes.map((route) => (
          <div
            key={route.id}
            className="group flex items-center justify-between rounded-xl border border-border-pastel bg-background p-3 transition-colors hover:border-primary/30"
          >
            <button
              onClick={() => handleSelect(route)}
              className="flex-1 text-left"
            >
              <div className="flex items-center gap-1.5 text-sm font-medium text-text-main">
                {route.label ?? `${route.origin_address.split(',')[0]} to ${route.destination_address.split(',')[0]}`}
                {route.alert_enabled && (
                  <span className="inline-flex h-4 items-center rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                    Alerts on
                  </span>
                )}
              </div>
              {route.label && (
                <div className="mt-0.5 text-xs text-text-secondary">
                  {route.origin_address.split(',')[0]} &rarr;{' '}
                  {route.destination_address.split(',')[0]}
                </div>
              )}
            </button>
            <div className="ml-2 flex items-center gap-1">
              {/* Alert toggle (bell icon) */}
              <button
                onClick={() => handleToggleAlert(route.id, route.alert_enabled)}
                disabled={togglingAlert === route.id}
                aria-label={
                  route.alert_enabled
                    ? 'Disable ride alerts for this route'
                    : 'Enable ride alerts for this route'
                }
                title={
                  route.alert_enabled
                    ? 'Alerts enabled -- get notified when new rides match'
                    : 'Get notified when new rides match this route'
                }
                className={`rounded-lg p-1 transition-colors disabled:opacity-50 ${
                  route.alert_enabled
                    ? 'text-primary hover:bg-primary/5'
                    : 'text-text-secondary opacity-0 hover:text-primary group-hover:opacity-100'
                }`}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill={route.alert_enabled ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  />
                </svg>
              </button>
              {/* Delete button */}
              <button
                onClick={() => handleDelete(route.id)}
                aria-label="Remove saved route"
                className="rounded-lg p-1 text-text-secondary opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
