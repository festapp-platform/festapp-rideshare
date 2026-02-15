import Link from "next/link";
import type { BookingStatus } from "@festapp/shared";

interface BookingPassenger {
  id: string;
  passenger_id: string;
  seats_booked: number;
  status: BookingStatus;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    rating_avg: number;
  } | null;
}

interface PassengerListProps {
  bookings: BookingPassenger[];
  seatsTotal: number;
}

export function PassengerList({ bookings, seatsTotal }: PassengerListProps) {
  const confirmedSeats = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + b.seats_booked, 0);

  return (
    <section className="rounded-2xl border border-border-pastel bg-surface p-5">
      <h2 className="mb-3 text-base font-semibold text-text-main">
        Passengers ({confirmedSeats}/{seatsTotal})
      </h2>

      {bookings.length === 0 ? (
        <p className="text-sm text-text-secondary">No passengers yet</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const profile = booking.profiles;
            const displayName = profile?.display_name ?? "Unknown";
            const initial = displayName.charAt(0).toUpperCase();

            return (
              <div key={booking.id} className="flex items-center gap-3">
                <Link
                  href={`/profile/${booking.passenger_id}`}
                  className="flex items-center gap-3 transition-opacity hover:opacity-80"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>

                  {/* Name */}
                  <span className="text-sm font-medium text-text-main">
                    {displayName}
                  </span>
                </Link>

                {/* Badges */}
                <div className="ml-auto flex items-center gap-2">
                  <span className="rounded-full bg-primary/5 px-2 py-0.5 text-xs font-medium text-text-secondary">
                    {booking.seats_booked}{" "}
                    {booking.seats_booked === 1 ? "seat" : "seats"}
                  </span>

                  {booking.status === "pending" && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
