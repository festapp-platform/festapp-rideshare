"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmailSchema } from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";

const ResetPasswordSchema = z.object({
  email: EmailSchema,
});

type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;

export default function ResetPasswordPage() {
  const { t } = useI18n();
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
      setError(t("common.unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t("auth.resetEmailSentTitle")}
        </h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
          {t("auth.resetEmailSentMessage")}
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-blue-600 hover:underline"
        >
          {t("auth.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
        {t("auth.resetPassword")}
      </h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-300">
        {t("auth.resetPasswordDescription")}
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="reset-email"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("auth.email")}
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            placeholder={t("auth.emailPlaceholder")}
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
          {isLoading ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {t("auth.rememberPassword")}{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
