import { createClient } from "@/lib/supabase/server";
import { CommunityStats } from "./community-stats";

/**
 * Community stats page -- shows platform-wide impact totals.
 * Public page accessible to all users.
 */
export default async function CommunityPage() {
  const supabase = await createClient();

  const [impactResult, userResult] = await Promise.all([
    supabase.rpc("get_community_impact"),
    supabase.auth.getUser(),
  ]);

  const impact = impactResult.data?.[0] ?? null;
  const isAuthenticated = !!userResult.data.user;

  return (
    <div>
      <CommunityStats impact={impact} isAuthenticated={isAuthenticated} />
    </div>
  );
}
