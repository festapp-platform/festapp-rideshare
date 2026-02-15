import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { colors } from "@festapp/shared";

/**
 * Vehicle management stack navigator.
 * Accessed from the profile tab, not a tab itself.
 */
export default function VehiclesLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? colors.dark : colors.light;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "My Vehicles" }} />
      <Stack.Screen name="new" options={{ title: "Add Vehicle" }} />
    </Stack>
  );
}
