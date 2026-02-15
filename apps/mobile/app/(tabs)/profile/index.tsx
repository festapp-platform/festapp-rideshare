import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { colors } from "@festapp/shared";

/**
 * Profile tab placeholder screen (NAV-05).
 * Shows user info placeholder and settings button (NAV-06).
 * Will show full profile in Phase 2.
 */
export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? colors.dark : colors.light;
  const router = useRouter();

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <View className="flex-1 px-6 pt-8">
        {/* User info placeholder */}
        <View className="mb-6 items-center">
          <View
            style={{ backgroundColor: theme.primaryLight }}
            className="mb-4 h-20 w-20 items-center justify-center rounded-full"
          >
            <FontAwesome name="user" size={36} color={theme.surface} />
          </View>
          <Text style={{ color: theme.text }} className="text-xl font-bold">
            Your Profile
          </Text>
          <Text
            style={{ color: theme.textSecondary }}
            className="mt-1 text-sm"
          >
            Profile details will appear here
          </Text>
        </View>

        {/* Settings button */}
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
          className="flex-row items-center rounded-xl border px-4 py-3"
        >
          <FontAwesome
            name="cog"
            size={20}
            color={theme.textSecondary}
            style={{ marginRight: 12 }}
          />
          <Text style={{ color: theme.text }} className="flex-1 text-base">
            Settings
          </Text>
          <FontAwesome
            name="chevron-right"
            size={14}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
