import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "./app-nav";

/**
 * Authenticated app layout (NAV-01).
 * Server component that checks auth and redirects to /login if no session.
 * Renders responsive navigation: sidebar on desktop, bottom tabs on mobile.
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

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Desktop sidebar */}
      <AppNav />

      {/* Main content */}
      <main className="flex-1 pb-16 md:pb-0">
        <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
