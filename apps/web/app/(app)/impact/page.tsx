import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ImpactDashboard } from "./impact-dashboard";

/**
 * Impact dashboard page -- shows user's environmental and community impact.
 * Server component that fetches impact stats, badges, streaks, and all badge definitions.
 */
export default async function ImpactPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [impactResult, badgesResult, streaksResult, allBadgesResult, profileResult] =
    await Promise.all([
      supabase.rpc("get_user_impact", { p_user_id: user.id }),
      supabase.rpc("get_user_badges", { p_user_id: user.id }),
      supabase.rpc("get_route_streaks", { p_user_id: user.id }),
      supabase.from("badge_definitions").select("*").order("category").order("threshold"),
      supabase
        .from("profiles")
        .select("completed_rides_count, rating_avg")
        .eq("id", user.id)
        .single(),
    ]);

  const impact = impactResult.data?.[0] ?? null;
  const badges = badgesResult.data ?? [];
  const streaks = streaksResult.data ?? [];
  const allBadges = allBadgesResult.data ?? [];
  const profile = profileResult.data;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Your Impact</h1>
      <ImpactDashboard
        impact={impact}
        badges={badges}
        allBadges={allBadges}
        streaks={streaks}
        completedRides={profile?.completed_rides_count ?? 0}
        ratingAvg={profile?.rating_avg ?? 0}
      />
    </div>
  );
}
