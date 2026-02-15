import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { colors } from "@festapp/shared";
import type { SocialLinks } from "@festapp/shared";
import { supabase } from "@/lib/supabase";

interface PublicProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: SocialLinks | null;
  id_verified: boolean;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  photo_url: string | null;
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? colors.dark : colors.light;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [primaryVehicle, setPrimaryVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!id) return;

    const [profileResult, phoneResult, vehicleResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, bio, avatar_url, social_links, id_verified, rating_avg, rating_count, created_at")
        .eq("id", id)
        .single(),
      supabase.rpc("is_phone_verified", { user_id: id }),
      supabase
        .from("vehicles")
        .select("id, make, model, photo_url")
        .eq("owner_id", id)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);

    if (profileResult.error || !profileResult.data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProfile(profileResult.data);
    setPhoneVerified(phoneResult.data === true);
    setPrimaryVehicle(vehicleResult.data || null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }} className="items-center px-6 pt-8">
        <View
          style={{ backgroundColor: theme.border }}
          className="mb-4 h-24 w-24 rounded-full"
        />
        <View
          style={{ backgroundColor: theme.border }}
          className="mb-2 h-6 w-40 rounded"
        />
        <View
          style={{ backgroundColor: theme.border }}
          className="h-4 w-56 rounded"
        />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }} className="items-center justify-center px-6">
        <FontAwesome name="user-times" size={48} color={theme.textSecondary} style={{ opacity: 0.4, marginBottom: 16 }} />
        <Text style={{ color: theme.text }} className="mb-2 text-xl font-bold">
          Profile Not Found
        </Text>
        <Text style={{ color: theme.textSecondary }} className="text-center text-sm">
          This user profile does not exist or has been removed.
        </Text>
      </View>
    );
  }

  const socialLinks = profile?.social_links as SocialLinks | null;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      className="px-6 pt-4"
    >
      {/* Profile card */}
      <View className="mb-6 items-center">
        {/* Avatar */}
        {profile?.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            className="mb-4 h-24 w-24 rounded-full"
          />
        ) : (
          <View
            style={{ backgroundColor: theme.primaryLight }}
            className="mb-4 h-24 w-24 items-center justify-center rounded-full"
          >
            <FontAwesome name="user" size={44} color={theme.surface} />
          </View>
        )}

        {/* Display name */}
        <Text style={{ color: theme.text }} className="text-xl font-bold">
          {profile?.display_name || "User"}
        </Text>

        {/* Verification badges */}
        <View className="mt-2 flex-row flex-wrap items-center justify-center" style={{ gap: 8 }}>
          {phoneVerified && (
            <View
              style={{ backgroundColor: "#dcfce7" }}
              className="flex-row items-center rounded-full px-2.5 py-1"
            >
              <FontAwesome name="check" size={10} color="#15803d" style={{ marginRight: 4 }} />
              <Text style={{ color: "#15803d" }} className="text-xs font-medium">
                Phone Verified
              </Text>
            </View>
          )}
          {profile?.id_verified && (
            <View
              style={{ backgroundColor: "#dbeafe" }}
              className="flex-row items-center rounded-full px-2.5 py-1"
            >
              <FontAwesome name="shield" size={10} color="#1d4ed8" style={{ marginRight: 4 }} />
              <Text style={{ color: "#1d4ed8" }} className="text-xs font-medium">
                ID Verified
              </Text>
            </View>
          )}
        </View>

        {/* Bio */}
        {profile?.bio && (
          <Text
            style={{ color: theme.textSecondary }}
            className="mt-3 text-center text-sm"
          >
            {profile.bio}
          </Text>
        )}

        {/* Social links */}
        {(socialLinks?.instagram || socialLinks?.facebook) && (
          <View className="mt-3 flex-row items-center" style={{ gap: 16 }}>
            {socialLinks?.instagram && (
              <TouchableOpacity
                onPress={() => Linking.openURL(socialLinks.instagram!)}
              >
                <FontAwesome name="instagram" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            {socialLinks?.facebook && (
              <TouchableOpacity
                onPress={() => Linking.openURL(socialLinks.facebook!)}
              >
                <FontAwesome name="facebook" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Member since */}
        {memberSince && (
          <Text
            style={{ color: theme.textSecondary }}
            className="mt-3 text-xs"
          >
            Member since {memberSince}
          </Text>
        )}
      </View>

      {/* Primary vehicle */}
      {primaryVehicle && (
        <View
          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          className="mb-3 rounded-xl border p-4"
        >
          <Text style={{ color: theme.text }} className="mb-2 text-sm font-semibold">
            Vehicle
          </Text>
          <View className="flex-row items-center">
            {primaryVehicle.photo_url ? (
              <Image
                source={{ uri: primaryVehicle.photo_url }}
                className="mr-3 h-10 w-14 rounded-lg"
                resizeMode="cover"
              />
            ) : (
              <View
                style={{ backgroundColor: theme.border }}
                className="mr-3 h-10 w-14 items-center justify-center rounded-lg"
              >
                <FontAwesome name="car" size={16} color={theme.textSecondary} />
              </View>
            )}
            <Text style={{ color: theme.text }} className="text-sm font-medium">
              {primaryVehicle.make} {primaryVehicle.model}
            </Text>
          </View>
        </View>
      )}

      {/* Ratings section */}
      <View
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        className="mb-3 rounded-xl border p-4"
      >
        <Text style={{ color: theme.text }} className="mb-2 text-sm font-semibold">
          Ratings
        </Text>
        {profile && profile.rating_count > 0 ? (
          <View className="flex-row items-center" style={{ gap: 4 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <FontAwesome
                key={star}
                name="star"
                size={18}
                color={star <= Math.round(profile.rating_avg || 0) ? "#facc15" : theme.border}
              />
            ))}
            <Text style={{ color: theme.textSecondary }} className="ml-2 text-sm">
              {(profile.rating_avg || 0).toFixed(1)} ({profile.rating_count})
            </Text>
          </View>
        ) : (
          <Text style={{ color: theme.textSecondary }} className="text-sm">
            No ratings yet
          </Text>
        )}
      </View>

      {/* Bottom padding */}
      <View className="h-8" />
    </ScrollView>
  );
}
