"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { uploadVehiclePhoto } from "@/lib/supabase/storage";
import { VehicleSchema, type Vehicle } from "@festapp/shared";

/**
 * Add/edit vehicle form (PROF-08, PROF-09).
 * Creates a new vehicle or edits existing one based on ?id= query param.
 * Supports car photo upload with client-side compression.
 */
export default function VehicleFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get("id");
  const isEdit = !!vehicleId;

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingVehicle, setLoadingVehicle] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Vehicle>({
    resolver: zodResolver(VehicleSchema),
    defaultValues: { make: "", model: "", color: "", license_plate: "" },
  });

  // Load existing vehicle data for edit mode
  useEffect(() => {
    if (!vehicleId) return;

    async function loadVehicle() {
      const { data, error } = await supabase
        .from("vehicles")
        .select("make, model, color, license_plate, photo_url")
        .eq("id", vehicleId)
        .single();

      if (error) {
        setError("Vehicle not found");
        setLoadingVehicle(false);
        return;
      }

      reset({
        make: data.make,
        model: data.model,
        color: data.color,
        license_plate: data.license_plate,
      });

      if (data.photo_url) {
        setPhotoPreview(data.photo_url);
      }
      setLoadingVehicle(false);
    }

    loadVehicle();
  }, [vehicleId, supabase, reset]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: Vehicle) => {
    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isEdit && vehicleId) {
        // Update existing vehicle
        const { error: updateError } = await supabase
          .from("vehicles")
          .update(data)
          .eq("id", vehicleId);

        if (updateError) throw updateError;

        // Upload new photo if selected
        if (photoFile) {
          const photoUrl = await uploadVehiclePhoto(
            photoFile,
            user.id,
            vehicleId,
          );
          await supabase
            .from("vehicles")
            .update({ photo_url: photoUrl })
            .eq("id", vehicleId);
        }
      } else {
        // Check if this is the user's first vehicle (auto-set primary)
        const { count } = await supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id);

        const isFirst = count === 0;

        // Insert new vehicle
        const { data: newVehicle, error: insertError } = await supabase
          .from("vehicles")
          .insert({
            ...data,
            owner_id: user.id,
            is_primary: isFirst,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        // Upload photo if selected
        if (photoFile && newVehicle) {
          const photoUrl = await uploadVehiclePhoto(
            photoFile,
            user.id,
            newVehicle.id,
          );
          await supabase
            .from("vehicles")
            .update({ photo_url: photoUrl })
            .eq("id", newVehicle.id);
        }
      }

      router.push("/vehicles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vehicle");
      setSaving(false);
    }
  };

  if (loadingVehicle) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">
        {isEdit ? "Edit Vehicle" : "Add Vehicle"}
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-border-pastel bg-surface p-6"
      >
        {error && (
          <div className="mb-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* Car photo upload */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-text-main">
            Car Photo
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full overflow-hidden rounded-xl border-2 border-dashed border-border-pastel transition-colors hover:border-primary/50"
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Vehicle preview"
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 text-text-secondary">
                <svg
                  className="h-10 w-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                  />
                </svg>
                <span className="text-sm">Click to add a photo</span>
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        {/* Form fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="make"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              Make
            </label>
            <input
              id="make"
              {...register("make")}
              placeholder="e.g. Toyota"
              className="w-full rounded-xl border border-border-pastel bg-background px-4 py-2.5 text-text-main placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
            />
            {errors.make && (
              <p className="mt-1 text-xs text-error">{errors.make.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="model"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              Model
            </label>
            <input
              id="model"
              {...register("model")}
              placeholder="e.g. Corolla"
              className="w-full rounded-xl border border-border-pastel bg-background px-4 py-2.5 text-text-main placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
            />
            {errors.model && (
              <p className="mt-1 text-xs text-error">{errors.model.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="color"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              Color
            </label>
            <input
              id="color"
              {...register("color")}
              placeholder="e.g. Silver"
              className="w-full rounded-xl border border-border-pastel bg-background px-4 py-2.5 text-text-main placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
            />
            {errors.color && (
              <p className="mt-1 text-xs text-error">{errors.color.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="license_plate"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              License Plate
            </label>
            <input
              id="license_plate"
              {...register("license_plate")}
              placeholder="e.g. ABC-123"
              className="w-full rounded-xl border border-border-pastel bg-background px-4 py-2.5 text-text-main placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
            />
            {errors.license_plate && (
              <p className="mt-1 text-xs text-error">
                {errors.license_plate.message}
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/vehicles")}
            className="rounded-xl border border-border-pastel px-6 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-primary/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update Vehicle" : "Add Vehicle"}
          </button>
        </div>
      </form>
    </div>
  );
}
