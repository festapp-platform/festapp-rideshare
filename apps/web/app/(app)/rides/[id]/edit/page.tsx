import { redirect } from "next/navigation";
import { getRideById } from "@festapp/shared";
import { createClient } from "@/lib/supabase/server";
import { EditRideForm } from "../../../components/edit-ride-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Edit Ride",
};

/**
 * Ride edit page at /rides/[id]/edit.
 * Server component: fetches ride data, verifies ownership, renders edit form.
 * Non-owners are redirected to the ride detail page.
 */
export default async function EditRidePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: ride } = await getRideById(supabase, id);

  if (!ride) {
    redirect("/my-rides");
  }

  // Only the driver can edit their ride
  if (ride.driver_id !== user.id) {
    redirect(`/rides/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-text-main">Edit Ride</h1>
      <EditRideForm ride={ride} />
    </div>
  );
}
