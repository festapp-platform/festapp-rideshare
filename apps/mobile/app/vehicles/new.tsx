import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { VehicleSchema, type Vehicle } from "@festapp/shared";
import { colors } from "@festapp/shared";
import { supabase } from "@/lib/supabase";
import { pickAndUploadVehiclePhoto } from "@/lib/image-upload";

/**
 * Add/edit vehicle form (PROF-08, PROF-09).
 * Creates a new vehicle or edits existing one based on route params.
 * Supports car photo upload via expo-image-picker.
 */
export default function VehicleFormScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? colors.dark : colors.light;
  const router = useRouter();
  const { id: vehicleId } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!vehicleId;

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingVehicle, setLoadingVehicle] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Vehicle>({
    resolver: zodResolver(VehicleSchema),
    defaultValues: { make: "", model: "", color: "", license_plate: "" },
  });

  // Load existing vehicle data for edit mode
  useEffect(() => {
    if (!vehicleId) return;

    async function loadVehicle() {
      const { data, error } = await supabase
        .from("vehicles")
        .select("make, model, color, license_plate, photo_url")
        .eq("id", vehicleId)
        .single();

      if (error) {
        setError("Vehicle not found");
        setLoadingVehicle(false);
        return;
      }

      reset({
        make: data.make,
        model: data.model,
        color: data.color,
        license_plate: data.license_plate,
      });

      if (data.photo_url) {
        setPhotoPreview(data.photo_url);
      }
      setLoadingVehicle(false);
    }

    loadVehicle();
  }, [vehicleId, reset]);

  const handlePhotoPick = async (currentVehicleId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const photoUrl = await pickAndUploadVehiclePhoto(
        user.id,
        currentVehicleId,
      );
      if (photoUrl) {
        setPhotoPreview(photoUrl);
        setPhotoUploaded(true);
        // Update vehicle photo_url
        await supabase
          .from("vehicles")
          .update({ photo_url: photoUrl })
          .eq("id", currentVehicleId);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload photo",
      );
    }
  };

  const onSubmit = async (data: Vehicle) => {
    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isEdit && vehicleId) {
        // Update existing vehicle
        const { error: updateError } = await supabase
          .from("vehicles")
          .update(data)
          .eq("id", vehicleId);

        if (updateError) throw updateError;

        router.back();
      } else {
        // Check if this is the user's first vehicle
        const { count } = await supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id);

        const isFirst = count === 0;

        // Insert new vehicle
        const { data: newVehicle, error: insertError } = await supabase
          .from("vehicles")
          .insert({
            ...data,
            owner_id: user.id,
            is_primary: isFirst,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        // Offer photo upload for the new vehicle
        if (newVehicle) {
          await handlePhotoPick(newVehicle.id);
        }

        router.back();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vehicle");
      setSaving(false);
    }
  };

  if (loadingVehicle) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: isEdit ? "Edit Vehicle" : "Add Vehicle" }}
      />
      <ScrollView
        className="flex-1 px-4 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View
            style={{
              backgroundColor: theme.error + "15",
              borderColor: theme.error + "40",
            }}
            className="mb-4 rounded-xl border px-4 py-3"
          >
            <Text style={{ color: theme.error }} className="text-sm">
              {error}
            </Text>
          </View>
        )}

        {/* Car photo area */}
        {isEdit && vehicleId && (
          <TouchableOpacity
            onPress={() => handlePhotoPick(vehicleId)}
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
            className="mb-6 overflow-hidden rounded-2xl border"
          >
            {photoPreview ? (
              <Image
                source={{ uri: photoPreview }}
                className="aspect-video w-full"
                resizeMode="cover"
              />
            ) : (
              <View
                style={{ backgroundColor: theme.primaryLight + "33" }}
                className="aspect-video items-center justify-center"
              >
                <FontAwesome
                  name="camera"
                  size={32}
                  color={theme.textSecondary}
                />
                <Text
                  style={{ color: theme.textSecondary }}
                  className="mt-2 text-sm"
                >
                  Tap to add a photo
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {!isEdit && (
          <View
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
            className="mb-6 items-center rounded-2xl border px-4 py-6"
          >
            <FontAwesome
              name="camera"
              size={28}
              color={theme.textSecondary}
            />
            <Text
              style={{ color: theme.textSecondary }}
              className="mt-2 text-center text-sm"
            >
              You can add a photo after saving the vehicle.
            </Text>
          </View>
        )}

        {/* Form fields */}
        <View
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
          className="rounded-2xl border p-4"
        >
          {/* Make */}
          <View className="mb-4">
            <Text
              style={{ color: theme.text }}
              className="mb-1 text-sm font-medium"
            >
              Make
            </Text>
            <Controller
              control={control}
              name="make"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Toyota"
                  placeholderTextColor={theme.textSecondary + "80"}
                  style={{
                    backgroundColor: theme.background,
                    borderColor: errors.make ? theme.error : theme.border,
                    color: theme.text,
                  }}
                  className="rounded-xl border px-4 py-3"
                />
              )}
            />
            {errors.make && (
              <Text style={{ color: theme.error }} className="mt-1 text-xs">
                {errors.make.message}
              </Text>
            )}
          </View>

          {/* Model */}
          <View className="mb-4">
            <Text
              style={{ color: theme.text }}
              className="mb-1 text-sm font-medium"
            >
              Model
            </Text>
            <Controller
              control={control}
              name="model"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Corolla"
                  placeholderTextColor={theme.textSecondary + "80"}
                  style={{
                    backgroundColor: theme.background,
                    borderColor: errors.model ? theme.error : theme.border,
                    color: theme.text,
                  }}
                  className="rounded-xl border px-4 py-3"
                />
              )}
            />
            {errors.model && (
              <Text style={{ color: theme.error }} className="mt-1 text-xs">
                {errors.model.message}
              </Text>
            )}
          </View>

          {/* Color */}
          <View className="mb-4">
            <Text
              style={{ color: theme.text }}
              className="mb-1 text-sm font-medium"
            >
              Color
            </Text>
            <Controller
              control={control}
              name="color"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Silver"
                  placeholderTextColor={theme.textSecondary + "80"}
                  style={{
                    backgroundColor: theme.background,
                    borderColor: errors.color ? theme.error : theme.border,
                    color: theme.text,
                  }}
                  className="rounded-xl border px-4 py-3"
                />
              )}
            />
            {errors.color && (
              <Text style={{ color: theme.error }} className="mt-1 text-xs">
                {errors.color.message}
              </Text>
            )}
          </View>

          {/* License Plate */}
          <View className="mb-4">
            <Text
              style={{ color: theme.text }}
              className="mb-1 text-sm font-medium"
            >
              License Plate
            </Text>
            <Controller
              control={control}
              name="license_plate"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. ABC-123"
                  placeholderTextColor={theme.textSecondary + "80"}
                  autoCapitalize="characters"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: errors.license_plate
                      ? theme.error
                      : theme.border,
                    color: theme.text,
                  }}
                  className="rounded-xl border px-4 py-3"
                />
              )}
            />
            {errors.license_plate && (
              <Text style={{ color: theme.error }} className="mt-1 text-xs">
                {errors.license_plate.message}
              </Text>
            )}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={saving}
          style={{
            backgroundColor: saving ? theme.primary + "80" : theme.primary,
          }}
          className="mt-6 mb-8 items-center rounded-xl py-3.5"
        >
          {saving ? (
            <ActivityIndicator color={theme.surface} />
          ) : (
            <Text
              style={{ color: theme.surface }}
              className="text-sm font-medium"
            >
              {isEdit ? "Update Vehicle" : "Add Vehicle"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
