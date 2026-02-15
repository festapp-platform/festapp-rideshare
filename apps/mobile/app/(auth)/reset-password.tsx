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
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmailSchema } from "@festapp/shared";
import { supabase } from "@/lib/supabase";

const ResetPasswordSchema = z.object({
  email: EmailSchema,
});

type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;

/**
 * Reset password screen for mobile.
 * Sends password reset email link via Supabase auth.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  async function onSubmit(values: ResetPasswordValues) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
      );
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          backgroundColor: "#ffffff",
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "600",
            color: "#111827",
            marginBottom: 12,
          }}
        >
          Check your email
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#6b7280",
            lineHeight: 20,
            marginBottom: 24,
          }}
        >
          We sent a password reset link to your email. Click the link to set a
          new password.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={{ alignItems: "center" }}
        >
          <Text style={{ fontSize: 14, color: "#2563eb" }}>
            Back to sign in
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#ffffff" }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "600",
            color: "#111827",
            marginBottom: 8,
          }}
        >
          Reset password
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#6b7280",
            marginBottom: 24,
            lineHeight: 20,
          }}
        >
          Enter your email and we&apos;ll send you a link to reset your
          password.
        </Text>

        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Email
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{
                  borderWidth: 1,
                  borderColor: errors.email ? "#ef4444" : "#d1d5db",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
              />
            )}
          />
          {errors.email && (
            <Text style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
              {errors.email.message}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
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
              Send reset link
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={{ alignItems: "center" }}
        >
          <Text style={{ fontSize: 14, color: "#6b7280" }}>
            Remember your password?{" "}
            <Text style={{ color: "#2563eb" }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
