"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProfileUpdateSchema, SocialLinksSchema } from "@festapp/shared";
import type { ProfileUpdate, SocialLinks } from "@festapp/shared";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar, uploadIdDocument } from "@/lib/supabase/storage";

interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: SocialLinks | null;
  id_document_url: string | null;
  id_verified: boolean;
  created_at: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  photo_url: string | null;
  is_primary: boolean;
}

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [primaryVehicle, setPrimaryVehicle] = useState<Vehicle | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idFileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileUpdate>({
    resolver: zodResolver(ProfileUpdateSchema),
    defaultValues: {
      display_name: "",
      bio: "",
      social_links: { instagram: "", facebook: "" },
    },
  });

  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const [profileResult, phoneResult, vehicleResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, bio, avatar_url, social_links, id_document_url, id_verified, created_at")
        .eq("id", user.id)
        .single(),
      supabase.rpc("is_phone_verified", { user_id: user.id }),
      supabase
        .from("vehicles")
        .select("id, make, model, photo_url, is_primary")
        .eq("owner_id", user.id)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      setMessage({ type: "error", text: "Failed to load profile" });
      setLoading(false);
      return;
    }

    setProfile(profileResult.data);
    setPhoneVerified(phoneResult.data === true);
    setPrimaryVehicle(vehicleResult.data || null);

    const socialLinks = profileResult.data.social_links as SocialLinks | null;
    form.reset({
      display_name: profileResult.data.display_name || "",
      bio: profileResult.data.bio || "",
      social_links: {
        instagram: socialLinks?.instagram || "",
        facebook: socialLinks?.facebook || "",
      },
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

  async function handleIdUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploadingId(true);
    setMessage(null);

    try {
      const supabaseClient = createClient();

      // Upload via Edge Function (random UUID filename, service_role)
      const publicUrl = await uploadIdDocument(file, userId);

      // Update profile with ID document URL and set verified
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ id_document_url: publicUrl, id_verified: true })
        .eq("id", userId);

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      setProfile((prev) =>
        prev ? { ...prev, id_document_url: publicUrl, id_verified: true } : prev,
      );
      setMessage({ type: "success", text: "ID document uploaded successfully" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to upload ID",
      });
    } finally {
      setUploadingId(false);
      // Reset file input
      if (idFileInputRef.current) {
        idFileInputRef.current.value = "";
      }
    }
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

      // Clean social links - remove empty strings
      const socialLinks = values.social_links
        ? {
            instagram: values.social_links.instagram || undefined,
            facebook: values.social_links.facebook || undefined,
          }
        : undefined;

      // Validate social links if provided
      if (socialLinks?.instagram || socialLinks?.facebook) {
        const result = SocialLinksSchema.safeParse(socialLinks);
        if (!result.success) {
          setMessage({
            type: "error",
            text: "Please enter valid URLs for social links",
          });
          setSaving(false);
          return;
        }
      }

      // Update profile text fields
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: values.display_name,
          bio: values.bio || null,
          social_links: socialLinks || null,
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
              social_links: socialLinks as SocialLinks | null,
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
      const socialLinks = profile.social_links as SocialLinks | null;
      form.reset({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        social_links: {
          instagram: socialLinks?.instagram || "",
          facebook: socialLinks?.facebook || "",
        },
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
  const socialLinks = profile?.social_links as SocialLinks | null;

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
            <div className="mb-4 w-full max-w-sm">
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

            {/* Social links inputs */}
            <div className="mb-4 w-full max-w-sm">
              <label
                htmlFor="instagram"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                Instagram URL
              </label>
              <input
                id="instagram"
                type="url"
                {...form.register("social_links.instagram")}
                className="w-full rounded-lg border border-border-pastel bg-background px-3 py-2 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="https://instagram.com/yourhandle"
              />
            </div>

            <div className="mb-6 w-full max-w-sm">
              <label
                htmlFor="facebook"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                Facebook URL
              </label>
              <input
                id="facebook"
                type="url"
                {...form.register("social_links.facebook")}
                className="w-full rounded-lg border border-border-pastel bg-background px-3 py-2 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="https://facebook.com/yourprofile"
              />
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

            {/* Display name with verification badges */}
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-text-main">
                {profile?.display_name || "Your Profile"}
              </h2>
            </div>

            {/* Verification badges */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {phoneVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Phone Verified
                </span>
              )}
              {profile?.id_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  ID Verified
                </span>
              )}
            </div>

            {profile?.bio && (
              <p className="mt-2 max-w-md text-center text-sm text-text-secondary">
                {profile.bio}
              </p>
            )}

            {/* Social links */}
            {(socialLinks?.instagram || socialLinks?.facebook) && (
              <div className="mt-3 flex items-center gap-3">
                {socialLinks?.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-secondary transition-colors hover:text-pink-600"
                    title="Instagram"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}
                {socialLinks?.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-secondary transition-colors hover:text-blue-600"
                    title="Facebook"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {!profile?.bio && !profile?.display_name && (
              <p className="mt-1 text-sm text-text-secondary">
                Tap Edit to set up your profile
              </p>
            )}
          </div>
        )}
      </div>

      {/* My Vehicles section */}
      <div className="mb-4 rounded-2xl border border-border-pastel bg-surface p-6">
        <h3 className="mb-3 text-sm font-semibold text-text-main">My Vehicles</h3>
        {primaryVehicle ? (
          <div className="flex items-center gap-3">
            {primaryVehicle.photo_url ? (
              <img
                src={primaryVehicle.photo_url}
                alt={`${primaryVehicle.make} ${primaryVehicle.model}`}
                className="h-12 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-border-pastel">
                <svg className="h-6 w-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h.386c.26 0 .516-.069.74-.2l2.598-1.52a1.125 1.125 0 01.57-.154h6.662a1.125 1.125 0 01.95.523l1.51 2.397a1.125 1.125 0 00.95.523h1.284a.75.75 0 00.75-.75v-2.25a.75.75 0 00-.167-.472l-2.478-3.097a1.125 1.125 0 00-.878-.426H8.25a1.125 1.125 0 00-.878.426L4.894 12.3a.75.75 0 00-.167.472v1.478z" />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-text-main">
                {primaryVehicle.make} {primaryVehicle.model}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            Add a vehicle to offer rides
          </p>
        )}
        <Link
          href="/vehicles"
          className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary/80"
        >
          Manage Vehicles
        </Link>
      </div>

      {/* ID Verification section */}
      <div className="mb-4 rounded-2xl border border-border-pastel bg-surface p-6">
        <h3 className="mb-3 text-sm font-semibold text-text-main">ID Verification</h3>
        {profile?.id_verified ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              ID Verified
            </span>
            <span className="text-sm text-text-secondary">Your ID has been verified</span>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-sm text-text-secondary">
              Upload a photo of your ID to increase trust with other users.
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20">
              {uploadingId ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload ID Document
                </>
              )}
              <input
                ref={idFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleIdUpload}
                className="hidden"
                disabled={uploadingId}
              />
            </label>
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
