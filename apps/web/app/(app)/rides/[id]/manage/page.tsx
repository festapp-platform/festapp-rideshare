import { redirect, notFound } from "next/navigation";
import { getRideById, getBookingsForRide } from "@festapp/shared";
import { createClient } from "@/lib/supabase/server";
import { ManageRideContent } from "./manage-ride-content";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ManageRidePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch ride data
  const { data: ride } = await getRideById(supabase, id);

  if (!ride) {
    notFound();
  }

  // Only the driver can access the manage page
  if (ride.driver_id !== user.id) {
    redirect(`/rides/${id}`);
  }

  // Fetch bookings for this ride
  const { data: bookings } = await getBookingsForRide(supabase, id);

  return (
    <div className="mx-auto max-w-2xl">
      <ManageRideContent
        ride={{
          id: ride.id,
          origin_address: ride.origin_address,
          destination_address: ride.destination_address,
          departure_time: ride.departure_time,
          seats_total: ride.seats_total,
          seats_available: ride.seats_available,
          status: ride.status,
        }}
        bookings={bookings ?? []}
      />
    </div>
  );
}
