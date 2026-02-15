"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  color: string;
  license_plate: string;
  photo_url: string | null;
  is_primary: boolean;
}

/**
 * Vehicle list page (PROF-07).
 * Shows the driver's vehicles as cards with photo, details, and actions.
 * Supports edit (navigate to form) and delete (inline confirm).
 */
export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchVehicles = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("vehicles")
      .select(
        "id, make, model, color, license_plate, photo_url, is_primary",
      )
      .eq("owner_id", user.id)
      .order("is_primary", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setVehicles(data ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleDelete = async (vehicle: Vehicle) => {
    if (deletingId === vehicle.id) {
      // Confirmed: delete vehicle and storage files
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Delete storage files for this vehicle
      const { data: files } = await supabase.storage
        .from("vehicles")
        .list(user.id, {
          search: vehicle.id,
        });

      if (files && files.length > 0) {
        await supabase.storage
          .from("vehicles")
          .remove(files.map((f) => `${user.id}/${f.name}`));
      }

      // Delete vehicle record
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicle.id);

      if (error) {
        setError(error.message);
      } else {
        setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
      }
      setDeletingId(null);
    } else {
      // First click: show confirm
      setDeletingId(vehicle.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-main">My Vehicles</h1>
        <Link
          href="/vehicles/new"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-primary/90"
        >
          Add Vehicle
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-border-pastel bg-surface px-8 py-12">
          <svg
            className="mb-4 h-16 w-16 text-text-secondary/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-2.25M16.5 18.75h-6m9-7.5V7.5a1.5 1.5 0 00-1.5-1.5h-7.197a1.5 1.5 0 00-1.317.782L7.66 10.5m12.84 0h-3.375a1.125 1.125 0 01-1.125-1.125V7.875a1.125 1.125 0 011.125-1.125H19.5a1.5 1.5 0 011.5 1.5v1.5m-9.84 0H5.25A2.25 2.25 0 003 12.75v3.375c0 .621.504 1.125 1.125 1.125h.375"
            />
          </svg>
          <h2 className="mb-2 text-lg font-semibold text-text-main">
            No vehicles yet
          </h2>
          <p className="mb-6 text-center text-sm text-text-secondary">
            Add your car to start offering rides.
          </p>
          <Link
            href="/vehicles/new"
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-primary/90"
          >
            Add Vehicle
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="overflow-hidden rounded-2xl border border-border-pastel bg-surface"
            >
              {/* Vehicle photo */}
              <div className="relative aspect-video bg-primary-light/20">
                {vehicle.photo_url ? (
                  <img
                    src={vehicle.photo_url}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg
                      className="h-12 w-12 text-text-secondary/30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-2.25M16.5 18.75h-6m9-7.5V7.5a1.5 1.5 0 00-1.5-1.5h-7.197a1.5 1.5 0 00-1.317.782L7.66 10.5m12.84 0h-3.375a1.125 1.125 0 01-1.125-1.125V7.875a1.125 1.125 0 011.125-1.125H19.5a1.5 1.5 0 011.5 1.5v1.5m-9.84 0H5.25A2.25 2.25 0 003 12.75v3.375c0 .621.504 1.125 1.125 1.125h.375"
                      />
                    </svg>
                  </div>
                )}
                {vehicle.is_primary && (
                  <span className="absolute right-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-surface">
                    Primary
                  </span>
                )}
              </div>

              {/* Vehicle details */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-text-main">
                  {vehicle.make} {vehicle.model}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-sm text-text-secondary">
                  <span>{vehicle.color}</span>
                  <span className="text-border-pastel">|</span>
                  <span className="font-mono">{vehicle.license_plate}</span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/vehicles/new?id=${vehicle.id}`}
                    className="flex-1 rounded-lg border border-border-pastel px-3 py-1.5 text-center text-sm font-medium text-text-main transition-colors hover:bg-primary/5"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(vehicle)}
                    onBlur={() => setDeletingId(null)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      deletingId === vehicle.id
                        ? "bg-error text-surface"
                        : "border border-error/30 text-error hover:bg-error/10"
                    }`}
                  >
                    {deletingId === vehicle.id ? "Confirm Delete" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
