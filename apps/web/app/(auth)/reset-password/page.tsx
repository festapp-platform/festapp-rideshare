"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmailSchema } from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const ResetPasswordSchema = z.object({
  email: EmailSchema,
});

type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  const supabase = createClient();

  async function onSubmit(values: ResetPasswordValues) {
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: `${window.location.origin}/auth/confirm`,
        },
      );
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Check your email
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          We sent a password reset link to your email address. Click the link to
          set a new password.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-blue-600 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        Reset password
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="reset-email"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
        >
          {isLoading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Remember your password?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
