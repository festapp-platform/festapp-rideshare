import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RideForm } from "../../components/ride-form";

export const metadata = {
  title: "Post a Ride",
  description: "Post a ride and find passengers for your trip.",
};

/**
 * Ride posting page at /rides/new.
 * Server component that checks auth and renders the client-side RideForm.
 */
export default async function NewRidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Post a Ride</h1>
      <RideForm />
      <div className="mt-4 text-center">
        <Link
          href="/rides/new/recurring"
          className="text-sm text-primary hover:underline"
        >
          Create a recurring ride instead
        </Link>
      </div>
    </div>
  );
}
