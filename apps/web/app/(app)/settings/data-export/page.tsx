"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * GDPR data export page (PLAT-06).
 * Allows users to download all their personal data as a JSON file.
 */
export default function DataExportPage() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("You must be logged in to export data.");
        setIsExporting(false);
        return;
      }

      const userId = user.id;

      // Fetch all user data in parallel
      const [
        profileRes,
        vehiclesRes,
        ridesRes,
        bookingsRes,
        reviewsGivenRes,
        reviewsReceivedRes,
        notificationPrefsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("vehicles").select("*").eq("owner_id", userId),
        supabase.from("rides").select("*").eq("driver_id", userId),
        supabase.from("bookings").select("*").eq("passenger_id", userId),
        supabase.from("reviews").select("*").eq("reviewer_id", userId),
        supabase.from("reviews").select("*").eq("reviewee_id", userId),
        supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", userId)
          .single(),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        email: user.email,
        profile: profileRes.data,
        vehicles: vehiclesRes.data ?? [],
        rides_as_driver: ridesRes.data ?? [],
        bookings_as_passenger: bookingsRes.data ?? [],
        reviews_given: reviewsGivenRes.data ?? [],
        reviews_received: reviewsReceivedRes.data ?? [],
        notification_preferences: notificationPrefsRes.data,
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "festapp-data-export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => router.push("/settings")}
        className="mb-4 text-sm text-primary hover:underline"
      >
        &larr; Back to Settings
      </button>

      <h1 className="mb-2 text-2xl font-bold text-text-main">
        Export Your Data
      </h1>
      <p className="mb-6 text-sm text-text-secondary">
        Download a copy of all your personal data stored in Festapp Rideshare.
        This includes your profile, vehicles, rides, bookings, reviews, and
        notification preferences.
      </p>

      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
      >
        {isExporting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Exporting...
          </>
        ) : (
          "Export Data"
        )}
      </button>
    </div>
  );
}
