import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { colors, ProfileUpdateSchema } from "@festapp/shared";
import type { ProfileUpdate, SocialLinks } from "@festapp/shared";
import { supabase } from "@/lib/supabase";
import { pickAndUploadAvatar } from "@/lib/image-upload";
import * as ImagePicker from "expo-image-picker";

interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: SocialLinks | null;
  id_document_url: string | null;
  id_verified: boolean;
  created_at: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  photo_url: string | null;
  is_primary: boolean;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? colors.dark : colors.light;
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [primaryVehicle, setPrimaryVehicle] = useState<Vehicle | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const form = useForm<ProfileUpdate>({
    resolver: zodResolver(ProfileUpdateSchema),
    defaultValues: {
      display_name: "",
      bio: "",
      social_links: { instagram: "", facebook: "" },
    },
  });

  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const [profileResult, phoneResult, vehicleResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, bio, avatar_url, social_links, id_document_url, id_verified, created_at")
        .eq("id", user.id)
        .single(),
      supabase.rpc("is_phone_verified", { user_id: user.id }),
      supabase
        .from("vehicles")
        .select("id, make, model, photo_url, is_primary")
        .eq("owner_id", user.id)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      setMessage({ type: "error", text: "Failed to load profile" });
      setLoading(false);
      return;
    }

    setProfile(profileResult.data);
    setPhoneVerified(phoneResult.data === true);
    setPrimaryVehicle(vehicleResult.data || null);

    const socialLinks = profileResult.data.social_links as SocialLinks | null;
    form.reset({
      display_name: profileResult.data.display_name || "",
      bio: profileResult.data.bio || "",
      social_links: {
        instagram: socialLinks?.instagram || "",
        facebook: socialLinks?.facebook || "",
      },
    });
    setLoading(false);
  }, [form]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleAvatarPress() {
    if (!editing || !userId) return;
    setUploadingAvatar(true);
    setMessage(null);

    try {
      const newUrl = await pickAndUploadAvatar(userId);
      if (newUrl) {
        setProfile((prev) => (prev ? { ...prev, avatar_url: newUrl } : prev));
      }
    } catch (error) {
      Alert.alert(
        "Upload Failed",
        error instanceof Error ? error.message : "Failed to upload avatar",
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleIdUpload() {
    if (!userId) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploadingId(true);
    setMessage(null);

    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const path = `${userId}/id-document-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          upsert: true,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        throw new Error(`Failed to upload ID: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ id_document_url: publicUrl, id_verified: true })
        .eq("id", userId);

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      setProfile((prev) =>
        prev ? { ...prev, id_document_url: publicUrl, id_verified: true } : prev,
      );
      setMessage({ type: "success", text: "ID document uploaded successfully" });
    } catch (error) {
      Alert.alert(
        "Upload Failed",
        error instanceof Error ? error.message : "Failed to upload ID",
      );
    } finally {
      setUploadingId(false);
    }
  }

  async function onSave(values: ProfileUpdate) {
    if (!userId) return;
    setSaving(true);
    setMessage(null);

    try {
      const socialLinks = values.social_links
        ? {
            instagram: values.social_links.instagram || undefined,
            facebook: values.social_links.facebook || undefined,
          }
        : undefined;

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: values.display_name,
          bio: values.bio || null,
          social_links: socialLinks || null,
        })
        .eq("id", userId);

      if (error) {
        setMessage({
          type: "error",
          text: `Failed to save profile: ${error.message}`,
        });
        setSaving(false);
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              display_name: values.display_name,
              bio: values.bio || null,
              social_links: socialLinks as SocialLinks | null,
            }
          : prev,
      );

      setEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditing(false);
    if (profile) {
      const socialLinks = profile.social_links as SocialLinks | null;
      form.reset({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        social_links: {
          instagram: socialLinks?.instagram || "",
          facebook: socialLinks?.facebook || "",
        },
      });
    }
    setMessage(null);
  }

  // Loading skeleton
  if (loading) {
    return (
      <SafeAreaView
        edges={["bottom"]}
        style={{ flex: 1, backgroundColor: theme.background }}
      >
        <View className="flex-1 items-center px-6 pt-8">
          <View
            style={{ backgroundColor: theme.border }}
            className="mb-4 h-20 w-20 rounded-full"
          />
          <View
            style={{ backgroundColor: theme.border }}
            className="mb-2 h-6 w-32 rounded"
          />
          <View
            style={{ backgroundColor: theme.border }}
            className="h-4 w-48 rounded"
          />
        </View>
      </SafeAreaView>
    );
  }

  const bioValue = form.watch("bio") || "";
  const socialLinks = profile?.social_links as SocialLinks | null;

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <ScrollView className="flex-1 px-6 pt-4">
        {/* Header with edit/cancel button */}
        <View className="mb-6 flex-row items-center justify-between">
          <Text style={{ color: theme.text }} className="text-2xl font-bold">
            Profile
          </Text>
          {!editing ? (
            <TouchableOpacity
              onPress={() => {
                setEditing(true);
                setMessage(null);
              }}
              style={{ backgroundColor: theme.primary }}
              className="rounded-lg px-4 py-2"
            >
              <Text
                style={{ color: theme.surface }}
                className="text-sm font-semibold"
              >
                Edit
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleCancelEdit}
              style={{ borderColor: theme.border }}
              className="rounded-lg border px-4 py-2"
            >
              <Text
                style={{ color: theme.textSecondary }}
                className="text-sm font-semibold"
              >
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status message */}
        {message && (
          <View
            style={{
              backgroundColor:
                message.type === "success" ? "#dcfce7" : "#fef2f2",
            }}
            className="mb-4 rounded-lg p-3"
          >
            <Text
              style={{
                color: message.type === "success" ? "#15803d" : "#b91c1c",
              }}
              className="text-sm"
            >
              {message.text}
            </Text>
          </View>
        )}

        {/* Profile section */}
        <View className="mb-6 items-center">
          {/* Avatar */}
          <TouchableOpacity
            onPress={handleAvatarPress}
            disabled={!editing || uploadingAvatar}
            activeOpacity={editing ? 0.7 : 1}
          >
            <View className="relative">
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  className="h-20 w-20 rounded-full"
                />
              ) : (
                <View
                  style={{ backgroundColor: theme.primaryLight }}
                  className="h-20 w-20 items-center justify-center rounded-full"
                >
                  <FontAwesome name="user" size={36} color={theme.surface} />
                </View>
              )}
              {uploadingAvatar && (
                <View
                  className="absolute inset-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                >
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              {editing && !uploadingAvatar && (
                <View
                  style={{ backgroundColor: theme.primary }}
                  className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full"
                >
                  <FontAwesome name="camera" size={12} color={theme.surface} />
                </View>
              )}
            </View>
          </TouchableOpacity>
          {editing && (
            <Text
              style={{ color: theme.textSecondary }}
              className="mt-2 text-xs"
            >
              Tap avatar to change photo
            </Text>
          )}
        </View>

        {editing ? (
          /* Edit mode */
          <View>
            {/* Display name */}
            <View className="mb-4">
              <Text
                style={{ color: theme.text }}
                className="mb-1 text-sm font-medium"
              >
                Display name
              </Text>
              <Controller
                control={form.control}
                name="display_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Your name"
                    placeholderTextColor={theme.textSecondary}
                    style={{
                      color: theme.text,
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    }}
                    className="rounded-lg border px-3 py-2.5 text-sm"
                  />
                )}
              />
              {form.formState.errors.display_name && (
                <Text style={{ color: theme.error }} className="mt-1 text-xs">
                  {form.formState.errors.display_name.message}
                </Text>
              )}
            </View>

            {/* Bio */}
            <View className="mb-4">
              <Text
                style={{ color: theme.text }}
                className="mb-1 text-sm font-medium"
              >
                Bio
              </Text>
              <Controller
                control={form.control}
                name="bio"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    value={value || ""}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Tell others a bit about yourself..."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    numberOfLines={3}
                    maxLength={300}
                    textAlignVertical="top"
                    style={{
                      color: theme.text,
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      minHeight: 80,
                    }}
                    className="rounded-lg border px-3 py-2.5 text-sm"
                  />
                )}
              />
              <View className="mt-1 flex-row justify-between">
                {form.formState.errors.bio && (
                  <Text style={{ color: theme.error }} className="text-xs">
                    {form.formState.errors.bio.message}
                  </Text>
                )}
                <Text
                  style={{ color: theme.textSecondary }}
                  className="ml-auto text-xs"
                >
                  {bioValue.length}/300
                </Text>
              </View>
            </View>

            {/* Social links */}
            <View className="mb-4">
              <Text
                style={{ color: theme.text }}
                className="mb-1 text-sm font-medium"
              >
                Instagram URL
              </Text>
              <Controller
                control={form.control}
                name="social_links.instagram"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    value={value || ""}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="https://instagram.com/yourhandle"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    keyboardType="url"
                    style={{
                      color: theme.text,
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    }}
                    className="rounded-lg border px-3 py-2.5 text-sm"
                  />
                )}
              />
            </View>

            <View className="mb-6">
              <Text
                style={{ color: theme.text }}
                className="mb-1 text-sm font-medium"
              >
                Facebook URL
              </Text>
              <Controller
                control={form.control}
                name="social_links.facebook"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    value={value || ""}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="https://facebook.com/yourprofile"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    keyboardType="url"
                    style={{
                      color: theme.text,
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    }}
                    className="rounded-lg border px-3 py-2.5 text-sm"
                  />
                )}
              />
            </View>

            {/* Save button */}
            <TouchableOpacity
              onPress={form.handleSubmit(onSave)}
              disabled={saving}
              style={{
                backgroundColor: theme.primary,
                opacity: saving ? 0.5 : 1,
              }}
              className="items-center rounded-lg py-3"
            >
              {saving ? (
                <ActivityIndicator color={theme.surface} size="small" />
              ) : (
                <Text
                  style={{ color: theme.surface }}
                  className="text-sm font-semibold"
                >
                  Save changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Display mode */
          <View className="items-center">
            <Text style={{ color: theme.text }} className="text-xl font-bold">
              {profile?.display_name || "Your Profile"}
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

            {profile?.bio ? (
              <Text
                style={{ color: theme.textSecondary }}
                className="mt-2 text-center text-sm"
              >
                {profile.bio}
              </Text>
            ) : (
              !profile?.display_name && (
                <Text
                  style={{ color: theme.textSecondary }}
                  className="mt-1 text-sm"
                >
                  Tap Edit to set up your profile
                </Text>
              )
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
          </View>
        )}

        {/* Spacer */}
        <View className="mt-8" />

        {/* My Vehicles section */}
        {!editing && (
          <TouchableOpacity
            onPress={() => router.push("/vehicles")}
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
            className="mb-3 rounded-xl border p-4"
          >
            <Text style={{ color: theme.text }} className="mb-2 text-sm font-semibold">
              My Vehicles
            </Text>
            {primaryVehicle ? (
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
                <Text style={{ color: theme.text }} className="flex-1 text-sm font-medium">
                  {primaryVehicle.make} {primaryVehicle.model}
                </Text>
                <FontAwesome name="chevron-right" size={14} color={theme.textSecondary} />
              </View>
            ) : (
              <View className="flex-row items-center justify-between">
                <Text style={{ color: theme.textSecondary }} className="text-sm">
                  Add a vehicle to offer rides
                </Text>
                <FontAwesome name="chevron-right" size={14} color={theme.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ID Verification section */}
        {!editing && (
          <View
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
            className="mb-3 rounded-xl border p-4"
          >
            <Text style={{ color: theme.text }} className="mb-2 text-sm font-semibold">
              ID Verification
            </Text>
            {profile?.id_verified ? (
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View
                  style={{ backgroundColor: "#dbeafe" }}
                  className="flex-row items-center rounded-full px-2.5 py-1"
                >
                  <FontAwesome name="shield" size={10} color="#1d4ed8" style={{ marginRight: 4 }} />
                  <Text style={{ color: "#1d4ed8" }} className="text-xs font-medium">
                    ID Verified
                  </Text>
                </View>
                <Text style={{ color: theme.textSecondary }} className="text-sm">
                  Your ID has been verified
                </Text>
              </View>
            ) : (
              <View>
                <Text style={{ color: theme.textSecondary }} className="mb-2 text-sm">
                  Upload a photo of your ID to increase trust.
                </Text>
                <TouchableOpacity
                  onPress={handleIdUpload}
                  disabled={uploadingId}
                  style={{ backgroundColor: theme.primary, opacity: uploadingId ? 0.5 : 1 }}
                  className="flex-row items-center justify-center rounded-lg py-2.5"
                  activeOpacity={0.7}
                >
                  {uploadingId ? (
                    <ActivityIndicator color={theme.surface} size="small" />
                  ) : (
                    <>
                      <FontAwesome name="upload" size={14} color={theme.surface} style={{ marginRight: 8 }} />
                      <Text style={{ color: theme.surface }} className="text-sm font-semibold">
                        Upload ID Document
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

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

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
