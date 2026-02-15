import { View, Text, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@festapp/shared";

/**
 * Messages tab placeholder screen (NAV-04).
 * Will contain real-time conversations in Phase 5.
 */
export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? colors.dark : colors.light;

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <View className="flex-1 items-center justify-center px-6">
        <Text style={{ color: theme.primary }} className="mb-2 text-4xl">
          💬
        </Text>
        <Text style={{ color: theme.text }} className="mb-2 text-xl font-bold">
          Messages
        </Text>
        <Text
          style={{ color: theme.textSecondary }}
          className="text-center text-sm"
        >
          Your conversations will appear here
        </Text>
      </View>
    </SafeAreaView>
  );
}
