import { createAdminClient } from "./supabase-client";

/** Create a booking directly via admin (bypassing RPCs) for test setup. */
export async function createTestBooking(
  rideId: string,
  passengerId: string,
  status: "pending" | "confirmed" | "completed" | "cancelled" = "confirmed",
  seatsBooked: number = 1,
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookings")
    .insert({
      ride_id: rideId,
      passenger_id: passengerId,
      seats_booked: seatsBooked,
      status,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create test booking: ${error.message}`);
  return data.id as string;
}
