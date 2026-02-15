import { View, Text } from "react-native";
import { OTP_LENGTH } from "@festapp/shared";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">Festapp Rideshare</Text>
      <Text className="mt-2 text-base text-gray-500">
        Free community ride-sharing platform
      </Text>
      <Text className="mt-2 text-sm text-gray-400">
        OTP length: {OTP_LENGTH} digits (imported from @festapp/shared)
      </Text>
    </View>
  );
}
