import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "./components/admin-sidebar";

/**
 * Admin panel layout (ADMN-01).
 * Server component that fetches the admin user and open reports count.
 * Separate from the main (app) layout -- no app shell, standalone admin UI.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch admin profile and open reports count in parallel
  const [profileResult, reportsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "reviewing"]),
  ]);

  const profile = profileResult.data;
  const openReportsCount = reportsResult.count ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      <AdminSidebar
        userName={profile?.display_name}
        avatarUrl={profile?.avatar_url}
        openReportsCount={openReportsCount}
      />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
