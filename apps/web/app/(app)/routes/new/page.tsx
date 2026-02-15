import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RouteIntentForm } from "./route-intent-form";

export const metadata = {
  title: "Post a Route",
  description: "Post a flexible route - passengers can subscribe and you confirm a date later.",
};

/**
 * Route intent creation page at /routes/new.
 * Server component that checks auth and renders the client-side form.
 */
export default async function NewRouteIntentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Post a Route</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Create a route you regularly travel. Passengers can subscribe and you can confirm a departure date when you are ready.
      </p>
      <RouteIntentForm />
    </div>
  );
}
