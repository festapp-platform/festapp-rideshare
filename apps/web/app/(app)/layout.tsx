import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "./app-nav";
import { GoogleMapsProvider } from "@/lib/google-maps-provider";

/**
 * Authenticated app layout (NAV-01).
 * Server component that checks auth and redirects to /login if no session.
 * Also checks onboarding completion status.
 * Renders responsive navigation: sidebar on desktop, bottom tabs on mobile.
 *
 * Onboarding check uses user_metadata flag. The client sets localStorage
 * and the onboarding page itself is within this layout so it renders
 * without the nav chrome (handled by the onboarding page's full-screen layout).
 */
export default async function AppLayout({
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

  // Check if the current path is the onboarding page
  const headersList = await headers();
  const pathname = headersList.get("x-next-pathname") || "";
  const isOnboarding = pathname.startsWith("/onboarding");

  // Onboarding page renders full-screen without nav
  if (isOnboarding) {
    return <>{children}</>;
  }

  return (
    <GoogleMapsProvider>
      <div className="flex min-h-screen flex-col bg-background md:flex-row">
        {/* Desktop sidebar */}
        <AppNav />

        {/* Main content */}
        <main className="flex-1 pb-16 md:pb-0">
          <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
        </main>
      </div>
    </GoogleMapsProvider>
  );
}
