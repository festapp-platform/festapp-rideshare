'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  onboardingSteps,
  ONBOARDING_COMPLETED_KEY,
  PROFILE_ONBOARDING_COMPLETED_KEY,
  DisplayNameSchema,
  VehicleSchema,
} from '@festapp/shared';
import type { OnboardingStep, OnboardingStepType } from '@festapp/shared';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/supabase/storage';

type UserRole = 'rider' | 'driver' | 'both';

/**
 * Web onboarding flow with profile creation, role selection, and optional vehicle setup.
 *
 * New users: welcome -> profile -> role -> [vehicle if driver/both] -> notifications -> ready
 * Existing users (old onboarding done, profile not): profile -> role -> [vehicle] -> ready
 * Fully onboarded users: redirect to /search
 */
export default function OnboardingPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Profile step state
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Role step state
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Vehicle step state
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null);
  const vehicleFileInputRef = useRef<HTMLInputElement>(null);

  // User ID for Supabase operations
  const [userId, setUserId] = useState<string | null>(null);

  // Determine which steps to show based on existing onboarding state
  const [filteredSteps, setFilteredSteps] = useState<OnboardingStep[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const oldDone = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
      const profileDone = localStorage.getItem(PROFILE_ONBOARDING_COMPLETED_KEY) === 'true';

      if (oldDone && profileDone) {
        // Fully onboarded, skip entirely
        router.replace('/search');
        return;
      }

      let steps: OnboardingStep[];
      if (oldDone && !profileDone) {
        // Existing user: only new profile steps + ready
        steps = onboardingSteps.filter((s) =>
          ['profile', 'role', 'vehicle', 'ready'].includes(s.id),
        );
      } else {
        // New user: full flow minus location (web skips it)
        steps = onboardingSteps.filter((s) => s.id !== 'location');
      }

      setFilteredSteps(steps);
      setInitialized(true);
    }
    init();
  }, [router]);

  // Recompute steps when role changes (to add/remove vehicle step)
  const activeSteps = filteredSteps.filter((s) => {
    if (s.id === 'vehicle') {
      return selectedRole === 'driver' || selectedRole === 'both';
    }
    return true;
  });

  const currentStep = activeSteps[currentIndex];

  const goToNext = useCallback(() => {
    setError(null);
    if (currentIndex < activeSteps.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, activeSteps.length]);

  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }, []);

  const handleProfileContinue = useCallback(async () => {
    setError(null);
    const result = DisplayNameSchema.safeParse(displayName.trim());
    if (!result.success) {
      setError('Please enter your name (1-50 characters).');
      return;
    }
    if (!userId) {
      setError('Not authenticated. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // Upload avatar if selected
      if (avatarFile) {
        await uploadAvatar(avatarFile, userId);
      }

      // Update display name
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', userId);

      if (updateError) throw new Error(updateError.message);
      goToNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  }, [displayName, avatarFile, userId, goToNext]);

  const handleRoleContinue = useCallback(async () => {
    setError(null);
    if (!selectedRole) {
      setError('Please select how you want to use Rideshare.');
      return;
    }
    if (!userId) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ user_role: selectedRole })
        .eq('id', userId);

      if (updateError) throw new Error(updateError.message);
      goToNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role.');
    } finally {
      setLoading(false);
    }
  }, [selectedRole, userId, goToNext]);

  const handleVehicleAdd = useCallback(async () => {
    setError(null);
    const vehicleData = {
      make: vehicleMake.trim(),
      model: vehicleModel.trim(),
      color: vehicleColor.trim(),
      license_plate: vehiclePlate.trim(),
    };
    const result = VehicleSchema.safeParse(vehicleData);
    if (!result.success) {
      setError('Please fill in all vehicle fields.');
      return;
    }
    if (!userId) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: vehicle, error: insertError } = await supabase
        .from('vehicles')
        .insert({ ...vehicleData, owner_id: userId })
        .select('id')
        .single();

      if (insertError) throw new Error(insertError.message);

      // Upload vehicle photo if selected
      if (vehiclePhotoFile && vehicle) {
        const { uploadVehiclePhoto } = await import('@/lib/supabase/storage');
        const photoUrl = await uploadVehiclePhoto(vehiclePhotoFile, userId, vehicle.id);
        await supabase
          .from('vehicles')
          .update({ photo_url: photoUrl })
          .eq('id', vehicle.id);
      }

      goToNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add vehicle.');
    } finally {
      setLoading(false);
    }
  }, [vehicleMake, vehicleModel, vehicleColor, vehiclePlate, vehiclePhotoFile, userId, goToNext]);

  const handleNotificationPermission = useCallback(async () => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch {
      // Permission request failed, continue anyway
    }
    goToNext();
  }, [goToNext]);

  const handleGetStarted = useCallback(() => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    localStorage.setItem(PROFILE_ONBOARDING_COMPLETED_KEY, 'true');
    router.push('/search');
  }, [router]);

  const handleButtonPress = useCallback(
    (step: OnboardingStep) => {
      switch (step.id) {
        case 'profile':
          handleProfileContinue();
          break;
        case 'role':
          handleRoleContinue();
          break;
        case 'vehicle':
          handleVehicleAdd();
          break;
        case 'notifications':
          handleNotificationPermission();
          break;
        case 'ready':
          handleGetStarted();
          break;
        default:
          goToNext();
      }
    },
    [handleProfileContinue, handleRoleContinue, handleVehicleAdd, handleNotificationPermission, handleGetStarted, goToNext],
  );

  const handleSkip = useCallback(
    (step: OnboardingStep) => {
      setError(null);
      // Vehicle skip: advance without saving
      // Permission skip: advance without requesting
      goToNext();
    },
    [goToNext],
  );

  if (!initialized || !currentStep) return null;

  // --- Step-specific content renderers ---

  const renderProfileStep = () => (
    <div className="space-y-6">
      {/* Avatar upload area */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative h-24 w-24 overflow-hidden rounded-full bg-muted transition-opacity hover:opacity-80"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarSelect}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">Tap to add a photo</p>

      {/* Display name input */}
      <div>
        <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-foreground">
          Display name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          maxLength={50}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );

  const roleOptions: { value: UserRole; label: string; desc: string }[] = [
    { value: 'rider', label: 'I want to ride', desc: 'Find rides to festivals and events' },
    { value: 'driver', label: 'I want to drive', desc: 'Offer rides and share your journey' },
    { value: 'both', label: 'Both', desc: 'Find and offer rides' },
  ];

  const renderRoleStep = () => (
    <div className="space-y-3">
      {roleOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setSelectedRole(option.value)}
          className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
            selectedRole === option.value
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40'
          }`}
        >
          <div className="font-semibold text-foreground">{option.label}</div>
          <div className="text-sm text-muted-foreground">{option.desc}</div>
        </button>
      ))}
    </div>
  );

  const renderVehicleStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="vMake" className="mb-1 block text-xs font-medium text-foreground">Make</label>
          <input id="vMake" type="text" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)}
            placeholder="Toyota" maxLength={50}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label htmlFor="vModel" className="mb-1 block text-xs font-medium text-foreground">Model</label>
          <input id="vModel" type="text" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)}
            placeholder="Corolla" maxLength={50}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="vColor" className="mb-1 block text-xs font-medium text-foreground">Color</label>
          <input id="vColor" type="text" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)}
            placeholder="Silver" maxLength={30}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label htmlFor="vPlate" className="mb-1 block text-xs font-medium text-foreground">License plate</label>
          <input id="vPlate" type="text" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)}
            placeholder="ABC-123" maxLength={20}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
        </div>
      </div>
      {/* Vehicle photo */}
      <button
        type="button"
        onClick={() => vehicleFileInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
        {vehiclePhotoFile ? vehiclePhotoFile.name : 'Add a photo (optional)'}
      </button>
      <input
        ref={vehicleFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => setVehiclePhotoFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Illustration placeholder */}
        <div
          className="mx-auto mb-8 h-36 w-36 rounded-full opacity-30"
          style={{ backgroundColor: currentStep.illustration }}
        />

        <h1 className="mb-3 text-3xl font-bold text-foreground">
          {currentStep.title}
        </h1>

        <p className="mb-8 text-base leading-relaxed text-muted-foreground">
          {currentStep.description}
        </p>

        {/* Step-specific content */}
        {currentStep.id === 'profile' && renderProfileStep()}
        {currentStep.id === 'role' && renderRoleStep()}
        {currentStep.id === 'vehicle' && renderVehicleStep()}

        {/* Error message */}
        {error && (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        )}

        {/* Main action button */}
        <button
          onClick={() => handleButtonPress(currentStep)}
          disabled={loading}
          className="mt-8 inline-block min-w-48 rounded-xl bg-primary px-12 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Saving...' : currentStep.buttonText}
        </button>

        {/* Skip option */}
        {currentStep.skipText && (
          <button
            onClick={() => handleSkip(currentStep)}
            disabled={loading}
            className="mt-4 block w-full p-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {currentStep.skipText}
          </button>
        )}

        {/* Step indicators */}
        <div className="mt-8 flex justify-center gap-2">
          {activeSteps.map((step, index) => (
            <div
              key={step.id}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-6 bg-primary'
                  : 'w-2 bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
