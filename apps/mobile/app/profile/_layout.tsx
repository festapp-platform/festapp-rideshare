import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { colors } from "@festapp/shared";

export default function ProfileLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? colors.dark : colors.light;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: "Profile",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
