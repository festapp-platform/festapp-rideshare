"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  EmailSchema,
  PasswordSchema,
  DisplayNameSchema,
  PhoneSchema,
  OtpSchema,
  OTP_LENGTH,
} from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// --- Email signup schema ---
const EmailSignUpSchema = z.object({
  display_name: DisplayNameSchema,
  email: EmailSchema,
  password: PasswordSchema,
});
type EmailSignUpValues = z.infer<typeof EmailSignUpSchema>;

// --- Phone signup schema ---
const PhoneSignUpSchema = z.object({
  phone: PhoneSchema,
});
type PhoneSignUpValues = z.infer<typeof PhoneSignUpSchema>;

const OtpVerifySchema = z.object({
  otp: OtpSchema,
});
type OtpVerifyValues = z.infer<typeof OtpVerifySchema>;

export default function SignupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);

  // Phone OTP flow state
  const [phoneForOtp, setPhoneForOtp] = useState<string | null>(null);

  const supabase = createClient();

  // --- Email form ---
  const emailForm = useForm<EmailSignUpValues>({
    resolver: zodResolver(EmailSignUpSchema),
  });

  async function onEmailSubmit(values: EmailSignUpValues) {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { display_name: values.display_name },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(
          "Check your email for a confirmation link to complete your signup.",
        );
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  // --- Phone form ---
  const phoneForm = useForm<PhoneSignUpValues>({
    resolver: zodResolver(PhoneSignUpSchema),
  });

  const otpForm = useForm<OtpVerifyValues>({
    resolver: zodResolver(OtpVerifySchema),
  });

  async function onPhoneSubmit(values: PhoneSignUpValues) {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: values.phone,
      });
      if (error) {
        setError(error.message);
      } else {
        setPhoneForOtp(values.phone);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpSubmit(values: OtpVerifyValues) {
    if (!phoneForOtp) return;
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneForOtp,
        token: values.otp,
        type: "sms",
      });
      if (error) {
        setError(error.message);
      } else {
        router.replace("/search");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  // --- Social auth ---
  async function signInWithGoogle() {
    setError(null);
    setIsSocialLoading("google");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch {
      setError("Google sign-in failed");
      setIsSocialLoading(null);
    }
  }

  async function signInWithApple() {
    setError(null);
    setIsSocialLoading("apple");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch {
      setError("Apple sign-in failed");
      setIsSocialLoading(null);
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-gray-900">
        Create account
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">
          {success}
        </div>
      )}

      {/* Tab switcher */}
      <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab("email");
            setError(null);
            setSuccess(null);
            setPhoneForOtp(null);
          }}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            activeTab === "email"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("phone");
            setError(null);
            setSuccess(null);
          }}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            activeTab === "phone"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Phone
        </button>
      </div>

      {/* Email tab */}
      {activeTab === "email" && (
        <form
          onSubmit={emailForm.handleSubmit(onEmailSubmit)}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="display_name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Display name
            </label>
            <input
              id="display_name"
              type="text"
              autoComplete="name"
              {...emailForm.register("display_name")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Your name"
            />
            {emailForm.formState.errors.display_name && (
              <p className="mt-1 text-xs text-red-500">
                {emailForm.formState.errors.display_name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              {...emailForm.register("email")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="you@example.com"
            />
            {emailForm.formState.errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              {...emailForm.register("password")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="At least 8 characters"
            />
            {emailForm.formState.errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {emailForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>
      )}

      {/* Phone tab */}
      {activeTab === "phone" && !phoneForOtp && (
        <form
          onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              {...phoneForm.register("phone")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="+420123456789"
            />
            {phoneForm.formState.errors.phone && (
              <p className="mt-1 text-xs text-red-500">
                {phoneForm.formState.errors.phone.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {isLoading ? "Sending code..." : "Send verification code"}
          </button>
        </form>
      )}

      {/* Phone OTP verification (inline) */}
      {activeTab === "phone" && phoneForOtp && (
        <form
          onSubmit={otpForm.handleSubmit(onOtpSubmit)}
          className="space-y-4"
        >
          <p className="text-sm text-gray-600">
            Enter the {OTP_LENGTH}-digit code sent to{" "}
            <strong>{phoneForOtp}</strong>
          </p>

          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              autoComplete="one-time-code"
              {...otpForm.register("otp")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-widest focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="000000"
            />
            {otpForm.formState.errors.otp && (
              <p className="mt-1 text-xs text-red-500">
                {otpForm.formState.errors.otp.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify code"}
          </button>

          <button
            type="button"
            onClick={() => setPhoneForOtp(null)}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Use a different number
          </button>
        </form>
      )}

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">or continue with</span>
        </div>
      </div>

      {/* Social buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={isSocialLoading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isSocialLoading === "google" ? "Connecting..." : "Google"}
        </button>

        <button
          type="button"
          onClick={signInWithApple}
          disabled={isSocialLoading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="white">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          {isSocialLoading === "apple" ? "Connecting..." : "Apple"}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
