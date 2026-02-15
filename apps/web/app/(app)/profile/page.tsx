"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProfileUpdateSchema } from "@festapp/shared";
import type { ProfileUpdate } from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/supabase/storage";

interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileUpdate>({
    resolver: zodResolver(ProfileUpdateSchema),
    defaultValues: {
      display_name: "",
      bio: "",
    },
  });

  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, bio, avatar_url")
      .eq("id", user.id)
      .single();

    if (error) {
      setMessage({ type: "error", text: "Failed to load profile" });
      setLoading(false);
      return;
    }

    setProfile(data);
    form.reset({
      display_name: data.display_name || "",
      bio: data.bio || "",
    });
    setLoading(false);
  }, [supabase, form]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  function handleAvatarClick() {
    if (editing) {
      fileInputRef.current?.click();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    avatarFileRef.current = file;
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  }

  async function onSave(values: ProfileUpdate) {
    if (!userId) return;
    setSaving(true);
    setMessage(null);

    try {
      // Upload avatar if a new file was selected
      if (avatarFileRef.current) {
        setUploadingAvatar(true);
        try {
          const newAvatarUrl = await uploadAvatar(
            avatarFileRef.current,
            userId,
          );
          setProfile((prev) =>
            prev ? { ...prev, avatar_url: newAvatarUrl } : prev,
          );
        } catch (error) {
          setMessage({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Failed to upload avatar",
          });
          setSaving(false);
          setUploadingAvatar(false);
          return;
        }
        setUploadingAvatar(false);
      }

      // Update profile text fields
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: values.display_name,
          bio: values.bio || null,
        })
        .eq("id", userId);

      if (error) {
        setMessage({ type: "error", text: `Failed to save profile: ${error.message}` });
        setSaving(false);
        return;
      }

      // Refresh profile state
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              display_name: values.display_name,
              bio: values.bio || null,
            }
          : prev,
      );

      // Clean up
      avatarFileRef.current = null;
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }

      setEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditing(false);
    avatarFileRef.current = null;
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    if (profile) {
      form.reset({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
      });
    }
    setMessage(null);
  }

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-text-main">Profile</h1>
        <div className="mb-6 flex animate-pulse flex-col items-center rounded-2xl border border-border-pastel bg-surface p-8">
          <div className="mb-4 h-20 w-20 rounded-full bg-border-pastel" />
          <div className="mb-2 h-6 w-32 rounded bg-border-pastel" />
          <div className="h-4 w-48 rounded bg-border-pastel" />
        </div>
      </div>
    );
  }

  const displayAvatarUrl = avatarPreview || profile?.avatar_url;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-main">Profile</h1>
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setMessage(null);
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-primary/90"
          >
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="rounded-lg border border-border-pastel px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-primary/5"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile card */}
      <div className="mb-6 rounded-2xl border border-border-pastel bg-surface p-8">
        {editing ? (
          <form
            onSubmit={form.handleSubmit(onSave)}
            className="flex flex-col items-center"
          >
            {/* Avatar (clickable in edit mode) */}
            <button
              type="button"
              onClick={handleAvatarClick}
              className="group relative mb-4"
            >
              {displayAvatarUrl ? (
                <img
                  src={displayAvatarUrl}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
                  <svg
                    className="h-10 w-10 text-surface"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
              {uploadingAvatar ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <svg
                    className="h-6 w-6 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/30">
                  <svg
                    className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="mb-6 text-xs text-text-secondary">
              Click avatar to change photo
            </p>

            {/* Display name input */}
            <div className="mb-4 w-full max-w-sm">
              <label
                htmlFor="display_name"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                Display name
              </label>
              <input
                id="display_name"
                type="text"
                {...form.register("display_name")}
                className="w-full rounded-lg border border-border-pastel bg-background px-3 py-2 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="Your name"
              />
              {form.formState.errors.display_name && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.display_name.message}
                </p>
              )}
            </div>

            {/* Bio input */}
            <div className="mb-6 w-full max-w-sm">
              <label
                htmlFor="bio"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                Bio
              </label>
              <textarea
                id="bio"
                {...form.register("bio")}
                rows={3}
                maxLength={300}
                className="w-full resize-none rounded-lg border border-border-pastel bg-background px-3 py-2 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="Tell others a bit about yourself..."
              />
              <div className="mt-1 flex justify-between">
                {form.formState.errors.bio && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.bio.message}
                  </p>
                )}
                <p className="ml-auto text-xs text-text-secondary">
                  {(form.watch("bio") || "").length}/300
                </p>
              </div>
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-surface transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && (
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        ) : (
          /* Display mode */
          <div className="flex flex-col items-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="mb-4 h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
                <svg
                  className="h-10 w-10 text-surface"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
            <h2 className="text-xl font-bold text-text-main">
              {profile?.display_name || "Your Profile"}
            </h2>
            {profile?.bio && (
              <p className="mt-2 max-w-md text-center text-sm text-text-secondary">
                {profile.bio}
              </p>
            )}
            {!profile?.bio && !profile?.display_name && (
              <p className="mt-1 text-sm text-text-secondary">
                Tap Edit to set up your profile
              </p>
            )}
          </div>
        )}
      </div>

      {/* Settings link */}
      <Link
        href="/settings"
        className="flex items-center justify-between rounded-xl border border-border-pastel bg-surface px-4 py-3 transition-colors hover:bg-primary/5"
      >
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-text-main">Settings</span>
        </div>
        <svg
          className="h-4 w-4 text-text-secondary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>
    </div>
  );
}
