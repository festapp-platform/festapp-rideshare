"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  CreateEventSchema,
  type CreateEvent,
  EVENT_NAME_MAX,
  EVENT_DESCRIPTION_MAX,
} from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import { AddressInput, type PlaceResult } from "../../components/address-input";

/**
 * Event creation page at /events/new.
 * Uses react-hook-form with Zod validation and AddressAutocomplete for location.
 */
export default function NewEventPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [location, setLocation] = useState<PlaceResult | null>(null);

  const form = useForm<CreateEvent>({
    resolver: zodResolver(CreateEventSchema),
    defaultValues: {
      name: "",
      description: "",
      location_address: "",
      location_lat: 0,
      location_lng: 0,
      event_date: "",
    },
  });

  function handleLocationSelect(place: PlaceResult) {
    setLocation(place);
    form.setValue("location_address", place.address);
    form.setValue("location_lat", place.lat);
    form.setValue("location_lng", place.lng);
  }

  async function onSubmit(values: CreateEvent) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSubmitError("You must be logged in to create an event.");
        return;
      }

      const { error } = await supabase.from("events").insert({
        creator_id: user.id,
        name: values.name,
        description: values.description || null,
        location_address: values.location_address,
        location: `POINT(${values.location_lng} ${values.location_lat})`,
        event_date: values.event_date,
        event_end_date: values.event_end_date || null,
        status: "pending",
      });

      if (error) {
        throw new Error(error.message || "Failed to create event");
      }

      router.push("/events");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create event",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">
        Create an Event
      </h1>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto max-w-2xl space-y-6"
      >
        <section className="rounded-2xl border border-border-pastel bg-surface p-6">
          {/* Name */}
          <div className="mb-4">
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              Event name
            </label>
            <input
              id="name"
              type="text"
              {...form.register("name")}
              maxLength={EVENT_NAME_MAX}
              placeholder="e.g. Music Festival Prague 2026"
              className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              {...form.register("description")}
              rows={3}
              maxLength={EVENT_DESCRIPTION_MAX}
              placeholder="Tell people about the event..."
              className="w-full resize-none rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {form.formState.errors.description && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="mb-4">
            <AddressInput
              label="Location"
              placeholder="Search for the event location..."
              onPlaceSelect={handleLocationSelect}
            />
            {form.formState.errors.location_address && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.location_address.message}
              </p>
            )}
          </div>

          {/* Event date */}
          <div className="mb-4">
            <label
              htmlFor="event_date"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              Event date & time
            </label>
            <input
              id="event_date"
              type="datetime-local"
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  form.setValue("event_date", new Date(val).toISOString());
                }
              }}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {form.formState.errors.event_date && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.event_date.message}
              </p>
            )}
          </div>

          {/* End date */}
          <div>
            <label
              htmlFor="event_end_date"
              className="mb-1 block text-sm font-medium text-text-main"
            >
              End date & time (optional)
            </label>
            <input
              id="event_end_date"
              type="datetime-local"
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  form.setValue(
                    "event_end_date",
                    new Date(val).toISOString(),
                  );
                } else {
                  form.setValue("event_end_date", undefined);
                }
              }}
              className="w-full rounded-xl border border-border-pastel bg-background px-4 py-3 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </section>

        {/* Submit error */}
        {submitError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Info */}
        <div className="rounded-lg bg-primary/5 p-3 text-sm text-text-secondary">
          Events are submitted for admin approval. You will be notified once your
          event is approved.
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-primary px-6 py-3 text-base font-semibold text-surface transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit Event for Approval"}
        </button>
      </form>
    </div>
  );
}
