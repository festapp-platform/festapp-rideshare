"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ConfirmRouteIntentSchema, type ConfirmRouteIntent } from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ConfirmDateProps {
  intentId: string;
  defaultSeats: number;
  defaultPrice: number | null;
  onCancel: () => void;
}

export function ConfirmDate({
  intentId,
  defaultSeats,
  defaultPrice,
  onCancel,
}: ConfirmDateProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);

  // Default departure time: tomorrow at 08:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  const defaultDateTime = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}T08:00`;

  const form = useForm<ConfirmRouteIntent>({
    resolver: zodResolver(ConfirmRouteIntentSchema),
    defaultValues: {
      departure_time: tomorrow.toISOString(),
      seats_total: defaultSeats,
      price_czk: defaultPrice ?? undefined,
    },
  });

  async function onSubmit(values: ConfirmRouteIntent) {
    // Two-step confirm pattern
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { data, error } = await supabase.rpc("confirm_route_intent", {
        p_intent_id: intentId,
        p_departure_time: new Date(values.departure_time).toISOString(),
        p_seats: values.seats_total ?? null,
        p_price: values.price_czk ?? null,
      });

      if (error) throw new Error(error.message || "Failed to confirm route");

      // RPC returns the new ride_id as UUID
      const rideId = data as string;

      toast.success("Date confirmed! Subscribers have been notified.");

      if (rideId) {
        router.push(`/rides/${rideId}`);
      } else {
        router.push("/routes");
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to confirm route",
      );
      setConfirmStep(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6"
    >
      <h3 className="mb-4 text-lg font-semibold text-text-main">
        Confirm Departure Date
      </h3>

      {/* Departure date/time */}
      <div className="mb-4">
        <label
          htmlFor="departure-time"
          className="mb-1 block text-sm font-medium text-text-main"
        >
          Departure date and time
        </label>
        <input
          id="departure-time"
          type="datetime-local"
          defaultValue={defaultDateTime}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              form.setValue("departure_time", new Date(val).toISOString());
            }
          }}
          min={new Date().toISOString().slice(0, 16)}
          className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
        {form.formState.errors.departure_time && (
          <p className="mt-1 text-xs text-red-500">
            {form.formState.errors.departure_time.message}
          </p>
        )}
      </div>

      {/* Optional seats override */}
      <div className="mb-4">
        <label
          htmlFor="seats-override"
          className="mb-1 block text-sm font-medium text-text-main"
        >
          Seats (optional override, default: {defaultSeats})
        </label>
        <input
          id="seats-override"
          type="number"
          min={1}
          max={8}
          {...form.register("seats_total", { valueAsNumber: true })}
          className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>

      {/* Optional price override */}
      <div className="mb-4">
        <label
          htmlFor="price-override"
          className="mb-1 block text-sm font-medium text-text-main"
        >
          Price per seat (optional override{defaultPrice != null ? `, default: ${defaultPrice} CZK` : ""})
        </label>
        <input
          id="price-override"
          type="number"
          min={0}
          max={5000}
          step={10}
          {...form.register("price_czk", { valueAsNumber: true })}
          className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>

      {submitError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border-pastel px-4 py-3 text-sm font-semibold text-text-main transition-colors hover:bg-primary/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-surface transition-colors disabled:opacity-50 ${
            confirmStep
              ? "bg-green-600 hover:bg-green-700"
              : "bg-primary hover:bg-primary/90"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Confirming...
            </span>
          ) : confirmStep ? (
            "Confirm & Notify Subscribers"
          ) : (
            "Confirm Date"
          )}
        </button>
      </div>

      {confirmStep && (
        <p className="mt-3 text-center text-xs text-text-secondary">
          Click again to confirm. This will create a ride and notify all subscribers.
        </p>
      )}
    </form>
  );
}
