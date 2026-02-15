import { useState, useEffect, useRef } from "react";
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
import { useLocalSearchParams } from "expo-router";
import { OTP_LENGTH, OTP_EXPIRY_SECONDS } from "@festapp/shared";
import { supabase } from "@/lib/supabase";

/**
 * OTP verification screen for phone auth.
 * Receives phone number from navigation params.
 * 6-digit OTP input with auto-submit and resend cooldown.
 */
export default function VerifyOtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRef = useRef<TextInput>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.length === OTP_LENGTH) {
      verifyOtp(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  async function verifyOtp(token: string) {
    if (!phone) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });
      if (error) {
        Alert.alert("Invalid Code", error.message);
        setOtp("");
        inputRef.current?.focus();
      }
      // On success, session is set automatically.
      // The auth gate in root _layout.tsx will redirect to home.
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  }

  async function resendCode() {
    if (!phone || resendCooldown > 0) return;
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setResendCooldown(60);
        Alert.alert("Code Sent", "A new verification code has been sent.");
      }
    } catch {
      Alert.alert("Error", "Failed to resend code");
    }
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
          Verify your phone
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#6b7280",
            marginBottom: 32,
            lineHeight: 20,
          }}
        >
          Enter the {OTP_LENGTH}-digit code sent to{" "}
          <Text style={{ fontWeight: "600", color: "#111827" }}>{phone}</Text>
        </Text>

        {/* OTP Input */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={(text) => {
            // Only allow numeric input up to OTP_LENGTH
            const cleaned = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
            setOtp(cleaned);
          }}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          autoFocus
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 16,
            fontSize: 24,
            textAlign: "center",
            letterSpacing: 12,
            marginBottom: 24,
          }}
        />

        {isLoading && (
          <ActivityIndicator
            size="large"
            color="#2563eb"
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Resend button */}
        <TouchableOpacity
          onPress={resendCode}
          disabled={resendCooldown > 0}
          style={{ alignItems: "center", marginBottom: 16 }}
        >
          <Text
            style={{
              fontSize: 14,
              color: resendCooldown > 0 ? "#9ca3af" : "#2563eb",
            }}
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend code"}
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 12,
            color: "#9ca3af",
            textAlign: "center",
          }}
        >
          Code expires in {Math.floor(OTP_EXPIRY_SECONDS / 60)} minutes
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
