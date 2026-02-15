import { redirect } from "next/navigation";

/**
 * Root page redirects to the search tab (default landing screen after auth).
 * NAV-02: Search is the default landing screen.
 */
export default function Home() {
  redirect("/search");
}
