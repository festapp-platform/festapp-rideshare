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
import {
  EmailSchema,
  PasswordSchema,
  DisplayNameSchema,
} from "@festapp/shared";
import { supabase } from "@/lib/supabase";

const SignUpFormSchema = z.object({
  display_name: DisplayNameSchema,
  email: EmailSchema,
  password: PasswordSchema,
  accepted_terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Service and Privacy Policy" }),
  }),
});

type SignUpFormValues = z.infer<typeof SignUpFormSchema>;

/**
 * Email signup screen for mobile.
 * Uses react-hook-form + Zod validation from @festapp/shared.
 */
export default function SignupScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(SignUpFormSchema),
  });

  async function onSubmit(values: SignUpFormValues) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            display_name: values.display_name,
            accepted_terms_at: new Date().toISOString(),
          },
        },
      });
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
          We sent a confirmation link to your email address. Click the link to
          complete your signup.
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
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "600",
            color: "#111827",
            marginBottom: 24,
          }}
        >
          Create your account
        </Text>

        {/* Display name */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Display name
          </Text>
          <Controller
            control={control}
            name="display_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Your name"
                autoComplete="name"
                style={{
                  borderWidth: 1,
                  borderColor: errors.display_name ? "#ef4444" : "#d1d5db",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
              />
            )}
          />
          {errors.display_name && (
            <Text style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
              {errors.display_name.message}
            </Text>
          )}
        </View>

        {/* Email */}
        <View style={{ marginBottom: 16 }}>
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

        {/* Password */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Password
          </Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="At least 8 characters"
                secureTextEntry
                autoComplete="new-password"
                style={{
                  borderWidth: 1,
                  borderColor: errors.password ? "#ef4444" : "#d1d5db",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                }}
              />
            )}
          />
          {errors.password && (
            <Text style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
              {errors.password.message}
            </Text>
          )}
        </View>

        {/* Terms of Service checkbox */}
        <Controller
          control={control}
          name="accepted_terms"
          render={({ field: { onChange, value } }) => (
            <TouchableOpacity
              onPress={() => onChange(!value)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderWidth: 1.5,
                  borderRadius: 4,
                  borderColor: value ? "#A8D5BA" : "#ccc",
                  backgroundColor: value ? "#A8D5BA" : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                {value && (
                  <Text
                    style={{
                      color: "white",
                      fontSize: 14,
                      fontWeight: "bold",
                    }}
                  >
                    ✓
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 12, color: "#666", flex: 1 }}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </TouchableOpacity>
          )}
        />
        {errors.accepted_terms && (
          <Text
            style={{
              fontSize: 12,
              color: "#ef4444",
              marginTop: -8,
              marginBottom: 16,
            }}
          >
            {errors.accepted_terms.message}
          </Text>
        )}

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
              Create account
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={{ alignItems: "center" }}
        >
          <Text style={{ fontSize: 14, color: "#6b7280" }}>
            Already have an account?{" "}
            <Text style={{ color: "#2563eb" }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
