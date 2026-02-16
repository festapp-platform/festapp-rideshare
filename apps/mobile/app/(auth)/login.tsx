import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PhoneSchema } from "@festapp/shared";
import { supabase } from "@/lib/supabase";

const PhoneFormSchema = z.object({
  phone: PhoneSchema,
});

type PhoneFormValues = z.infer<typeof PhoneFormSchema>;

/**
 * Login screen: Phone OTP as primary method, social auth, email link.
 * Per ONBR-01: minimal sign-up, phone or social on one screen.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneFormValues>({
    resolver: zodResolver(PhoneFormSchema),
    defaultValues: { phone: "+420" },
  });

  async function onPhoneSubmit(values: PhoneFormValues) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: values.phone,
      });
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        router.push({
          pathname: "/(auth)/verify-otp",
          params: { phone: values.phone },
        });
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      // TODO: Configure native Google Sign In SDK
      // 1. Install and configure @react-native-google-signin/google-signin
      // 2. Get idToken from Google Sign In
      // 3. Call supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
      Alert.alert(
        "Google Sign-In",
        "Native Google Sign-In requires additional configuration. See docs for setup.",
      );
    } catch {
      Alert.alert("Error", "Google sign-in failed");
    }
  }

  async function signInWithApple() {
    try {
      // TODO: Configure native Apple Sign In
      // 1. Install and configure @invertase/react-native-apple-authentication
      // 2. Get identityToken and nonce from Apple Auth
      // 3. Call supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken, nonce })
      Alert.alert(
        "Apple Sign-In",
        "Native Apple Sign-In requires additional configuration. See docs for setup.",
      );
    } catch {
      Alert.alert("Error", "Apple sign-in failed");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#ffffff" }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / title */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Text style={{ fontSize: 28, fontWeight: "bold", color: "#111827" }}>
            spolujizda.online
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
            Free community ride-sharing
          </Text>
        </View>

        {/* Phone input */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Phone number
          </Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="+420123456789"
                keyboardType="phone-pad"
                autoComplete="tel"
                style={{
                  borderWidth: 1,
                  borderColor: errors.phone ? "#ef4444" : "#d1d5db",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                  backgroundColor: "#ffffff",
                }}
              />
            )}
          />
          {errors.phone && (
            <Text style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
              {errors.phone.message}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleSubmit(onPhoneSubmit)}
          disabled={isLoading}
          style={{
            backgroundColor: "#2563eb",
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: "center",
            opacity: isLoading ? 0.5 : 1,
            marginBottom: 24,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>
              Continue with phone
            </Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View
            style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }}
          />
          <Text
            style={{
              paddingHorizontal: 12,
              fontSize: 13,
              color: "#9ca3af",
            }}
          >
            or continue with
          </Text>
          <View
            style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }}
          />
        </View>

        {/* Social buttons */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={signInWithGoogle}
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: "#ffffff",
            }}
          >
            <Text
              style={{ fontSize: 16, fontWeight: "500", color: "#374151" }}
            >
              Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={signInWithApple}
            style={{
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: "#000000",
            }}
          >
            <Text
              style={{ fontSize: 16, fontWeight: "500", color: "#ffffff" }}
            >
              Apple
            </Text>
          </TouchableOpacity>
        </View>

        {/* Email link */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          style={{ alignItems: "center", marginBottom: 32 }}
        >
          <Text style={{ fontSize: 14, color: "#2563eb" }}>
            Sign in with email
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
