import { Redirect } from "expo-router";

/**
 * Root index redirects to the search tab (default landing screen after auth).
 * NAV-02: Search tab is the default landing screen.
 */
export default function Index() {
  return <Redirect href="/(tabs)/search" />;
}
