import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { supabase } from "@/lib/supabase";
import { colors } from "@festapp/shared";
import type { ColorTokens } from "@festapp/shared";

/**
 * Settings screen (NAV-06).
 * Implements logout (AUTH-04) and account deletion (AUTH-05).
 * Accessible from Profile tab.
 */

type SectionItem = {
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
  loading?: boolean;
};

function SettingsSection({
  title,
  items,
  theme,
}: {
  title: string;
  items: SectionItem[];
  theme: ColorTokens;
}) {
  return (
    <View className="mb-6">
      <Text
        style={{ color: theme.textSecondary }}
        className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider"
      >
        {title}
      </Text>
      <View
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        className="overflow-hidden rounded-xl border"
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.onPress}
            disabled={item.loading}
            className="flex-row items-center px-4 py-3"
            style={
              index < items.length - 1
                ? { borderBottomWidth: 1, borderBottomColor: theme.border }
                : undefined
            }
          >
            <FontAwesome
              name={item.icon as any}
              size={18}
              color={item.destructive ? theme.error : theme.textSecondary}
              style={{ marginRight: 12, width: 20, textAlign: "center" }}
            />
            <Text
              style={{
                color: item.destructive ? theme.error : theme.text,
              }}
              className="flex-1 text-base"
            >
              {item.label}
            </Text>
            {item.loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <FontAwesome
                name="chevron-right"
                size={14}
                color={theme.textSecondary}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? colors.dark : colors.light;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Error", "Failed to log out. Please try again.");
      }
      // Auth gate in root layout handles redirect to login
    } catch {
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { error } = await supabase.functions.invoke(
                "delete-account",
              );
              if (error) {
                Alert.alert(
                  "Error",
                  "Failed to delete account. Please try again.",
                );
                setIsDeleting(false);
                return;
              }
              // Sign out after successful deletion
              await supabase.auth.signOut();
              // Auth gate in root layout handles redirect
            } catch {
              Alert.alert("Error", "An unexpected error occurred.");
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <ScrollView className="flex-1 px-4 pt-4">
        <SettingsSection
          title="Preferences"
          theme={theme}
          items={[
            {
              label: "Language",
              icon: "globe",
              onPress: () => Alert.alert("Coming Soon", "Language settings will be available in a future update."),
            },
            {
              label: "Notifications",
              icon: "bell",
              onPress: () => Alert.alert("Coming Soon", "Notification preferences will be available in a future update."),
            },
          ]}
        />

        <SettingsSection
          title="Account"
          theme={theme}
          items={[
            {
              label: "Log Out",
              icon: "sign-out",
              onPress: handleLogout,
              loading: isLoggingOut,
            },
            {
              label: "Delete Account",
              icon: "trash",
              onPress: handleDeleteAccount,
              destructive: true,
              loading: isDeleting,
            },
          ]}
        />

        <SettingsSection
          title="Info"
          theme={theme}
          items={[
            {
              label: "Help & Support",
              icon: "question-circle",
              onPress: () => Alert.alert("Coming Soon", "Help center will be available in a future update."),
            },
            {
              label: "Legal",
              icon: "file-text",
              onPress: () => Alert.alert("Coming Soon", "Legal information will be available in a future update."),
            },
          ]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
