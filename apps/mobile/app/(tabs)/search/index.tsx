import { View, Text, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@festapp/shared";

/**
 * Search tab placeholder screen (NAV-02).
 * Will contain ride search functionality in Phase 3.
 */
export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? colors.dark : colors.light;

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <View className="flex-1 items-center justify-center px-6">
        <View
          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          className="w-full rounded-2xl border p-6"
        >
          <View
            style={{ borderColor: theme.border }}
            className="mb-4 h-12 w-full rounded-xl border px-4 justify-center"
          >
            <Text style={{ color: theme.textSecondary }} className="text-base">
              Where are you going?
            </Text>
          </View>
          <Text
            style={{ color: theme.textSecondary }}
            className="text-center text-sm"
          >
            Search for rides to festivals, events, and more
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
