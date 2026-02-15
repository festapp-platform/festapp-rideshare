import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { colors } from "@festapp/shared";
import { supabase } from "@/lib/supabase";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  color: string;
  license_plate: string;
  photo_url: string | null;
  is_primary: boolean;
}

/**
 * Vehicle list screen (PROF-07).
 * Shows the driver's vehicles as cards with photo and details.
 * Accessed from the profile tab.
 */
export default function VehiclesScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? colors.dark : colors.light;
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("vehicles")
      .select("id, make, model, color, license_plate, photo_url, is_primary")
      .eq("owner_id", user.id)
      .order("is_primary", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setVehicles(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleDelete = (vehicle: Vehicle) => {
    Alert.alert(
      "Delete Vehicle",
      `Are you sure you want to delete ${vehicle.make} ${vehicle.model}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            // Delete storage files for this vehicle
            const { data: files } = await supabase.storage
              .from("vehicles")
              .list(user.id, { search: vehicle.id });

            if (files && files.length > 0) {
              await supabase.storage
                .from("vehicles")
                .remove(files.map((f) => `${user.id}/${f.name}`));
            }

            // Delete vehicle record
            const { error } = await supabase
              .from("vehicles")
              .delete()
              .eq("id", vehicle.id);

            if (error) {
              setError(error.message);
            } else {
              setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
            }
          },
        },
      ],
    );
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <View
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
      className="mb-4 overflow-hidden rounded-2xl border"
    >
      {/* Vehicle photo */}
      <View
        style={{ backgroundColor: theme.primaryLight + "33" }}
        className="aspect-video"
      >
        {item.photo_url ? (
          <Image
            source={{ uri: item.photo_url }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <FontAwesome
              name="car"
              size={40}
              color={theme.textSecondary + "50"}
            />
          </View>
        )}
        {item.is_primary && (
          <View
            style={{ backgroundColor: theme.primary }}
            className="absolute right-2 top-2 rounded-full px-2.5 py-0.5"
          >
            <Text style={{ color: theme.surface }} className="text-xs font-medium">
              Primary
            </Text>
          </View>
        )}
      </View>

      {/* Vehicle details */}
      <View className="p-4">
        <Text
          style={{ color: theme.text }}
          className="text-lg font-semibold"
        >
          {item.make} {item.model}
        </Text>
        <View className="mt-1 flex-row items-center gap-3">
          <Text style={{ color: theme.textSecondary }} className="text-sm">
            {item.color}
          </Text>
          <Text style={{ color: theme.border }}>|</Text>
          <Text
            style={{ color: theme.textSecondary, fontFamily: "monospace" }}
            className="text-sm"
          >
            {item.license_plate}
          </Text>
        </View>

        {/* Actions */}
        <View className="mt-4 flex-row gap-2">
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: "/vehicles/new", params: { id: item.id } })
            }
            style={{ borderColor: theme.border }}
            className="flex-1 items-center rounded-lg border py-1.5"
          >
            <Text style={{ color: theme.text }} className="text-sm font-medium">
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={{ borderColor: theme.error + "50" }}
            className="flex-1 items-center rounded-lg border py-1.5"
          >
            <Text style={{ color: theme.error }} className="text-sm font-medium">
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 px-4 pt-4">
      {/* Add Vehicle button */}
      <TouchableOpacity
        onPress={() => router.push("/vehicles/new")}
        style={{ backgroundColor: theme.primary }}
        className="mb-4 items-center rounded-xl py-3"
      >
        <Text style={{ color: theme.surface }} className="text-sm font-medium">
          Add Vehicle
        </Text>
      </TouchableOpacity>

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

      {vehicles.length === 0 ? (
        <View
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
          className="items-center rounded-2xl border px-8 py-12"
        >
          <FontAwesome
            name="car"
            size={48}
            color={theme.textSecondary + "60"}
          />
          <Text
            style={{ color: theme.text }}
            className="mt-4 text-lg font-semibold"
          >
            No vehicles yet
          </Text>
          <Text
            style={{ color: theme.textSecondary }}
            className="mt-2 text-center text-sm"
          >
            Add your car to start offering rides.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/vehicles/new")}
            style={{ backgroundColor: theme.primary }}
            className="mt-6 rounded-xl px-6 py-2.5"
          >
            <Text
              style={{ color: theme.surface }}
              className="text-sm font-medium"
            >
              Add Vehicle
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
