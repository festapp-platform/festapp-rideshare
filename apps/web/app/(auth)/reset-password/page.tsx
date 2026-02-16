"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmailSchema, PasswordSchema } from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { EyeIcon, EyeSlashIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/provider";

// --- Request reset schema (email only) ---
const RequestResetSchema = z.object({
  email: EmailSchema,
});
type RequestResetValues = z.infer<typeof RequestResetSchema>;

// --- Set new password schema ---
const NewPasswordSchema = z.object({
  password: PasswordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Hesla se neshodují",
});
type NewPasswordValues = z.infer<typeof NewPasswordSchema>;

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const isConfirmed = searchParams.has("confirmed");
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasSession(!!user);
    });
  }, []);

  // Still checking auth state
  if (hasSession === null) {
    return null;
  }

  // If user has a session (logged in or via recovery link), show password form
  if (isConfirmed || hasSession) {
    return <SetNewPasswordForm />;
  }
  return <RequestResetForm />;
}

/** Step 1: Enter email to request a reset link */
function RequestResetForm() {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestResetValues>({
    resolver: zodResolver(RequestResetSchema),
  });

  const supabase = createClient();

  async function onSubmit(values: RequestResetValues) {
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
        <h2 className="mb-4 text-xl font-semibold text-text-main">
          {t("auth.resetEmailSentTitle")}
        </h2>
        <p className="mb-6 text-sm text-text-secondary">
          {t("auth.resetEmailSentMessage")}
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-primary hover:underline"
        >
          {t("auth.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-text-main">
        {t("auth.resetPassword")}
      </h2>
      <p className="mb-6 text-sm text-text-secondary">
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
            className="mb-1 block text-sm font-medium text-text-secondary"
          >
            {t("auth.email")}
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            placeholder={t("auth.emailPlaceholder")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none disabled:opacity-50"
        >
          {isLoading ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        {t("auth.rememberPassword")}{" "}
        <Link href="/login" className="text-primary hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}

/** Step 2: Set new password (after clicking the recovery link) */
function SetNewPasswordForm() {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordValues>({
    resolver: zodResolver(NewPasswordSchema),
  });

  const supabase = createClient();

  async function onSubmit(values: NewPasswordValues) {
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
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
        <h2 className="mb-4 text-xl font-semibold text-text-main">
          {t("auth.passwordUpdatedTitle")}
        </h2>
        <p className="mb-6 text-sm text-text-secondary">
          {t("auth.passwordUpdatedMessage")}
        </p>
        <Link
          href="/search"
          className="inline-block w-full rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none"
        >
          {t("auth.continueToApp")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-text-main">
        {t("auth.newPassword")}
      </h2>
      <p className="mb-6 text-sm text-text-secondary">
        {t("auth.newPasswordDescription")}
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="new-password"
            className="mb-1 block text-sm font-medium text-text-secondary"
          >
            {t("auth.newPasswordLabel")}
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              {...register("password")}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-10 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder={t("auth.passwordHint")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-main"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1 block text-sm font-medium text-text-secondary"
          >
            {t("auth.confirmPasswordLabel")}
          </label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("confirmPassword")}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            placeholder={t("auth.confirmPasswordPlaceholder")}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none disabled:opacity-50"
        >
          {isLoading ? t("auth.updatingPassword") : t("auth.updatePassword")}
        </button>
      </form>
    </div>
  );
}
